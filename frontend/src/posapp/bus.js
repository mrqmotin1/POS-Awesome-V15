import mitt from "mitt";

export default {
	install: (app, options) => {
		const bus = mitt();
		app.config.globalProperties.__ = window.__;
		app.config.globalProperties.frappe = window.frappe;
		app.config.globalProperties.eventBus = bus;

		// Provide for Composition API usage
		app.provide("eventBus", bus);
		app.provide("__", window.__);
		app.provide("frappe", window.frappe);
	},
};
