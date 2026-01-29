export const getCardColumns = (width) => {
	if (width <= 768) {
		return 1;
	}
	if (width <= 1200) {
		return 2;
	}
	return 3;
};

export const getCardGap = (width) => {
	if (width <= 768) {
		return 10;
	}
	if (width <= 1200) {
		return 12;
	}
	return 16;
};

export const getCardPadding = (width) => {
	if (width <= 768) {
		return 10;
	}
	if (width <= 1200) {
		return 12;
	}
	return 16;
};
