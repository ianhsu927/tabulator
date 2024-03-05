import Module from '../../core/Module.js';

import defaultModes from './defaults/modes.js';

class Layout extends Module {

	constructor(table) {
		super(table, "layout");

		this.mode = null;

		this.registerTableOption("layout", "fitData");	// 布局类型
		this.registerTableOption("layoutColumnsOnNewData", false); // 在 setData 时更新列宽

		this.registerColumnOption("widthGrow");		// 列宽增长
		this.registerColumnOption("widthShrink");	// 列宽缩小
	}

	// 初始化布局系统
	initialize() {
		var layout = this.table.options.layout;

		if (Layout.modes[layout]) {
			this.mode = layout;
		} else {
			console.warn("Layout Error - invalid mode set, defaulting to 'fitData' : " + layout);
			this.mode = 'fitData';
		}

		this.table.element.setAttribute("tabulator-layout", this.mode);
		this.subscribe("column-init", this.initializeColumn.bind(this));
	}

	// 初始化列
	initializeColumn(column) {
		if (column.definition.widthGrow) {
			column.definition.widthGrow = Number(column.definition.widthGrow);
		}
		if (column.definition.widthShrink) {
			column.definition.widthShrink = Number(column.definition.widthShrink);
		}
	}

	getMode() {
		return this.mode;
	}

	// 触发表格布局
	layout(dataChanged) {
		this.dispatch("layout-refreshing");
		Layout.modes[this.mode].call(this, this.table.columnManager.columnsByIndex, dataChanged);
		this.dispatch("layout-refreshed");
	}
}

Layout.moduleName = "layout";

// 加载默认值
Layout.modes = defaultModes;

export default Layout;
