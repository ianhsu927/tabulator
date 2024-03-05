/**
 * 模块的基类
 */
import CoreFeature from './CoreFeature.js';
import Popup from './tools/Popup.js';

class Module extends CoreFeature {

	constructor(table, name) {
		super(table);

		this._handler = null;
	}

	initialize() {
		// 默认空
		// 设置模块，当表格初始化时，将在模块中覆盖
	}


	///////////////////////////////////
	////// Options Registration ///////
	///////////////////////////////////

	// 注册模块选项
	registerTableOption(key, value) {
		this.table.optionsList.register(key, value);
	}

	// 注册列选项
	registerColumnOption(key, value) {
		this.table.columnManager.optionsList.register(key, value);
	}

	///////////////////////////////////
	/// Public Function Registration ///
	///////////////////////////////////

	// 注册公共函数
	registerTableFunction(name, func) {
		if (typeof this.table[name] === "undefined") {
			this.table[name] = (...args) => {
				this.table.initGuard(name);

				return func(...args);
			};
		} else {
			console.warn("Unable to bind table function, name already in use", name);
		}
	}

	// 注册组件函数
	registerComponentFunction(component, func, handler) {
		return this.table.componentFunctionBinder.bind(component, func, handler);
	}

	///////////////////////////////////
	////////// Data Pipeline //////////
	///////////////////////////////////

	// 注册数据处理器
	registerDataHandler(handler, priority) {
		this.table.rowManager.registerDataPipelineHandler(handler, priority);
		this._handler = handler;
	}

	// 注册显示处理器
	registerDisplayHandler(handler, priority) {
		this.table.rowManager.registerDisplayPipelineHandler(handler, priority);
		this._handler = handler;
	}

	// 显示行
	displayRows(adjust) {
		var index = this.table.rowManager.displayRows.length - 1,
			lookupIndex;

		if (this._handler) {
			lookupIndex = this.table.rowManager.displayPipeline.findIndex((item) => {
				return item.handler === this._handler;
			});

			if (lookupIndex > -1) {
				index = lookupIndex;
			}
		}

		if (adjust) {
			index = index + adjust;
		}

		if (this._handler) {
			if (index > -1) {
				return this.table.rowManager.getDisplayRows(index);
			} else {
				return this.activeRows();
			}
		}
	}

	// 活动行
	activeRows() {
		return this.table.rowManager.activeRows;
	}

	// 刷新数据
	refreshData(renderInPosition, handler) {
		if (!handler) {
			handler = this._handler;
		}

		if (handler) {
			this.table.rowManager.refreshActiveData(handler, false, renderInPosition);
		}
	}

	///////////////////////////////////
	//////// Footer Management ////////
	///////////////////////////////////

	// 添加页脚
	footerAppend(element) {
		return this.table.footerManager.append(element);
	}

	// 前置页脚
	footerPrepend(element) {
		return this.table.footerManager.prepend(element);
	}

	// 删除页脚
	footerRemove(element) {
		return this.table.footerManager.remove(element);
	}

	///////////////////////////////////
	//////// Popups Management ////////
	///////////////////////////////////

	// 创建弹出框
	popup(menuEl, menuContainer) {
		return new Popup(this.table, menuEl, menuContainer);
	}

	///////////////////////////////////
	//////// Alert Management ////////
	///////////////////////////////////

	// 弹出警告
	alert(content, type) {
		return this.table.alertManager.alert(content, type);
	}

	// 清除警告
	clearAlert() {
		return this.table.alertManager.clear();
	}

}

export default Module;
