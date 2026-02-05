import renderOfflineInvoiceHTML from "../../offline_print_template.js";

const DEFAULT_READY_SELECTORS = ["#print-view", ".print-format"];
const DEFAULT_TIMEOUT = 10000;

function waitForDocumentSelectors(targetWindow, selectors, timeout) {
	return new Promise((resolve, reject) => {
		if (!targetWindow) {
			reject(new Error("No print target available"));
			return;
		}

		let doc;
		try {
			doc = targetWindow.document;
		} catch (err) {
			reject(err);
			return;
		}

		if (!doc) {
			reject(new Error("Print target has no document"));
			return;
		}

		let completed = false;
		let observer;
		let interval;
		let timer;
		let handleUnload;

		const cleanup = () => {
			if (observer) observer.disconnect();
			if (interval) clearInterval(interval);
			if (timer) clearTimeout(timer);
			if (handleUnload) {
				try {
					targetWindow.removeEventListener("beforeunload", handleUnload);
				} catch (err) {
					console.warn("Failed to remove unload handler from print target", err);
				}
			}
		};

		const finish = (err) => {
			if (completed) return;
			completed = true;
			cleanup();
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		};

		const isReady = () => {
			try {
				return selectors.some((selector) => doc.querySelector(selector));
			} catch (err) {
				console.warn("Failed to query print selector", err);
				return false;
			}
		};

		handleUnload = () => {
			finish(new Error("Print target navigated away before ready"));
		};

		if (isReady()) {
			finish();
			return;
		}

		try {
			const root = doc.body || doc.documentElement;
			if (root) {
				observer = new MutationObserver(() => {
					if (isReady()) {
						finish();
					}
				});
				observer.observe(root, { childList: true, subtree: true });
			}
		} catch (err) {
			console.warn("Failed to observe print document mutations", err);
		}

		interval = setInterval(() => {
			if (targetWindow.closed) {
				finish(new Error("Print target closed before ready"));
				return;
			}
			if (isReady()) {
				finish();
			}
		}, 200);

		timer = setTimeout(() => {
			finish(new Error("Timed out waiting for print markup"));
		}, timeout);

		try {
			targetWindow.addEventListener("beforeunload", handleUnload, { once: true });
		} catch (err) {
			console.warn("Failed to attach unload handler to print target", err);
		}
	});
}

async function fallbackToOfflinePrint(invoiceDoc, existingWindow) {
	if (!invoiceDoc) {
		return false;
	}

	try {
		const html = await renderOfflineInvoiceHTML(invoiceDoc);
		if (!html) {
			return false;
		}

		let target = existingWindow && !existingWindow.closed ? existingWindow : null;
		if (target) {
			try {
				target.document.open();
			} catch (err) {
				console.warn("Failed to reuse print window for offline fallback", err);
				target = null;
			}
		}

		if (!target) {
			target = window.open("", "_blank");
			if (!target) {
				return false;
			}
			target.document.open();
		}

		target.document.write(html);
		target.document.close();
		target.focus();
		target.print();
		return true;
	} catch (err) {
		console.error("Offline print fallback failed", err);
		return false;
	}
}

async function ensureReadyAndPrint(targetWindow, options = {}) {
	if (!targetWindow) {
		return;
	}

	const {
		selectors = DEFAULT_READY_SELECTORS,
		timeout = DEFAULT_TIMEOUT,
		invoiceDoc = null,
		allowOfflineFallback = true,
	} = options;

	const readySelectors = Array.isArray(selectors) ? selectors.filter(Boolean) : [selectors].filter(Boolean);

	try {
		await waitForDocumentSelectors(
			targetWindow,
			readySelectors.length ? readySelectors : DEFAULT_READY_SELECTORS,
			timeout,
		);
		targetWindow.focus();
		targetWindow.print();
	} catch (err) {
		console.warn("Print readiness check failed", err);
		let usedFallback = false;
		if (allowOfflineFallback && invoiceDoc) {
			usedFallback = await fallbackToOfflinePrint(invoiceDoc, targetWindow);
		}
		if (!usedFallback) {
			try {
				targetWindow.focus();
				targetWindow.print();
			} catch (printErr) {
				console.error("Printing failed after readiness check error", printErr);
			}
		}
	}
}

export function watchPrintWindow(printWindow, options = {}) {
	if (!printWindow) {
		return;
	}

	const handleLoad = () => {
		ensureReadyAndPrint(printWindow, options);
	};

	try {
		const doc = printWindow.document;
		if (doc?.readyState === "complete") {
			handleLoad();
		} else {
			printWindow.addEventListener("load", handleLoad, { once: true });
		}
	} catch (err) {
		console.warn("Unable to attach load handler to print window", err);
		setTimeout(() => ensureReadyAndPrint(printWindow, options), 0);
	}
}

export function silentPrint(url, options = {}) {
	if (!url) return;
	try {
		const iframe = document.createElement("iframe");
		iframe.style.position = "fixed";
		iframe.style.right = "0";
		iframe.style.bottom = "0";
		iframe.style.width = "0";
		iframe.style.height = "0";
		iframe.style.border = "0";
		iframe.onload = () => {
			const contentWindow = iframe.contentWindow;
			const cleanup = () => setTimeout(() => iframe.remove(), 1000);
			Promise.resolve(ensureReadyAndPrint(contentWindow, options)).finally(cleanup);
		};
		iframe.src = url;
		document.body.appendChild(iframe);
	} catch (err) {
		console.error("Silent print failed, falling back to new window", err);
		const win = window.open(url, "_blank");
		if (win) {
			watchPrintWindow(win, options);
		}
	}
}


//for raw silent print using QZ Tray #################
export function rawSilentPrint(doc, print_format) {
    // 1. Fetch the Raw Content from Server
    frappe.call({
        method: 'frappe.www.printview.get_html_and_style',
        args: {
            doc: doc,
            print_format: print_format,
        },
        callback: async (r) => {
            if (!r.exc && r.message && r.message.html) {
                // 2. Parse the response to get clean ESC/POS commands
                const txt = document.createElement("textarea");
                txt.innerHTML = r.message.html;
                const rawContent = txt.value;
                try {                 
                    if (!QZ) {
                        frappe.throw("QZ Helper is not loaded.");
                        return;
                    }
                    // Get Printer
                    const printerName = await QZ.getPosPrinter();
                    console.log("Configured POS Printer:", printerName);

                    if (!printerName) {
                        frappe.throw("No POS Printer Configured in User Settings.");
                        return;
                    }
                    // Create Config & Print
                    const config = qz.configs.create(printerName, { forceRaw: true });
                    // const data = [{
                    //     type: 'raw',
                    //     format: 'image',
                    //     flavor: 'file',
                    //     data: rawContent,
					// 	options: { language: "ESCPOS", dotDensity: 'double' }
						
                    // }];

					// Function to load and process an image into Hex
                    const processImage = (src, w, h) => {
                        return new Promise((resolve) => {
                            const img = new Image();
                            img.onload = () => resolve(getRasterBytes(img, w, h));
                            img.src = src;
                        });
                    };

                    // Load both images simultaneously
                    const [topImageHex, bottomImageHex] = await Promise.all([
                        processImage("/files/Frame 3.png", 512, 80),     // Header Logo
                        processImage("/files/Frame 11.png", 512, 250)     // Footer Image
                    ]);

					var data = [
						'\x1B\x40', // Initialize printer first!
						'\x1B\x61\x01',
						{ type: 'raw', format: 'command', flavor: 'hex', data: topImageHex },
						'\x0A',              // Line break after top image
						rawContent,		
						'\x0A',              // 5. Line break
                        '\x1B\x61\x01',      // 6. Center for bottom image
                        { type: 'raw', format: 'command', flavor: 'hex', data: bottomImageHex },
                        '\x0A\x0A\x0A',      // 7. Space before cut
                        '\x1D\x56\x41\x00'			
					];
                   await qz.print(config, data);              

                } catch (err) {
                    console.error("QZ Error:", err);
                    frappe.msgprint("Printing Error: " + err);
                }
            } else {
                console.error("Failed to fetch print content", r);
                frappe.msgprint("Could not fetch print format data.");
            }
        }
    });
}

function getRasterBytes(imgElement, width, height) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Width 304 (Multiple of 8 for Epson alignment)
    // Height 60 (To match your 60px CSS requirement)
    canvas.width = width;
    canvas.height = height;

    // 1. Clear background to white
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);
    
    // 2. Draw the image forced into the 304x60 box
    // This replicates "width: 300px; height: 60px;"
    ctx.drawImage(imgElement, 0, 0, width, height);
    
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    const bytesPerRow = width / 8; // 38 bytes
    let raster = [];

    // GS v 0 Header: GS, v, 0, m, xL, xH, yL, yH
    raster.push(0x1D, 0x76, 0x30, 0x00); 
    raster.push(bytesPerRow & 0xFF, (bytesPerRow >> 8) & 0xFF); 
    raster.push(height & 0xFF, (height >> 8) & 0xFF);           

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < bytesPerRow; x++) {
            let byte = 0;
            for (let bit = 0; bit < 8; bit++) {
                const idx = ((y * width) + (x * 8) + bit) * 4;
                const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2], a = pixels[idx + 3];

                // Thresholding with Alpha support
                if (a >= 128) {
                    const luminance = (r * 0.299 + g * 0.587 + b * 0.114);
                    if (luminance < 128) {
                        byte |= (0x80 >> bit);
                    }
                }
            }
            raster.push(byte);
        }
    }
    return raster.map(b => b.toString(16).padStart(2, '0')).join('');
}


// var data = [

// { type: 'raw', format: 'image', flavor: 'file', data: "/files/Frame 11.png", options: { language: "ESCPOS", dotDensity: 'single' } },

// '\x1B' + '\x40', // init

// '\x1B' + '\x4D' + '\x31', // small text

// 'EAT ME' + '\x0A',

// '\x0A' + '\x0A' + '\x0A' + '\x0A' + '\x0A' + '\x0A' + '\x0A',

// '\x1B' + '\x69',

// ];