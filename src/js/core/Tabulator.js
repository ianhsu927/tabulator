'use strict';

import defaultOptions from './defaults/options.js';

import ColumnManager from './ColumnManager.js';
import RowManager from './RowManager.js';
import FooterManager from './FooterManager.js';

import InteractionMonitor from './tools/InteractionMonitor.js';
import ComponentFunctionBinder from './tools/ComponentFunctionBinder.js';
import DataLoader from './tools/DataLoader.js';

import ExternalEventBus from './tools/ExternalEventBus.js';
import InternalEventBus from './tools/InternalEventBus.js';

import DeprecationAdvisor from './tools/DeprecationAdvisor.js';

import TableRegistry from './tools/TableRegistry.js';
import ModuleBinder from './tools/ModuleBinder.js';

import OptionsList from './tools/OptionsList.js';

import Alert from './tools/Alert.js';

class Tabulator {

	constructor(element, options) {

		this.options = {};

		this.columnManager = null; 	// 列管理
		this.rowManager = null; 	// 行管理
		this.footerManager = null; 	// 页脚管理
		this.alertManager = null; 	// 警告管理
		this.vdomHoz = null; 		// holder 水平虚拟 DOM
		this.externalEvents = null; // 处理外置的事件消息
		this.eventBus = null; 		// 处理内置事件消息
		this.interactionMonitor = false; // 检测交互
		this.browser = ""; 			// hold 当前浏览器类型
		this.browserSlow = false; 	// 处理简化的函数功能以适应较慢的浏览器
		this.browserMobile = false; // 移动端检测, prevent resize cancelling edit on keyboard appearance
		this.rtl = false; 			// 检查表格是否在 RTL(Right to left) 模式
		this.originalElement = null;//hold 原始的表格元素 if it has been replaced

		this.componentFunctionBinder = new ComponentFunctionBinder(this); // 绑定组件函数
		this.dataLoader = false;	// 绑定组件函数

		this.modules = {}; //hold 绑定到 table 的模块
		this.modulesCore = []; //hold 绑定到 table 的核心模块(用于初始化)
		this.modulesRegular = []; //hold 绑定到 table 的常规模块(用于初始化)

		this.deprecationAdvisor = new DeprecationAdvisor(this);
		this.optionsList = new OptionsList(this, "table constructor");

		this.initialized = false;
		this.destroyed = false;

		if (this.initializeElement(element)) {

			this.initializeCoreSystems(options);

			// 推迟 table 的创建以允许在构造函数之后立即进行事件绑定
			setTimeout(() => {
				this._create();
			});
		}

		// 注册 table 以进行设备间通信
		TableRegistry.register(this);
	}

	/* 
	初始化元素, 通过选择器或者 HTML 对象
	使用的是 querySelector 而不是 document.getElementById, 因此需要添加 #
	*/
	initializeElement(element) {
		if (typeof HTMLElement !== "undefined" && element instanceof HTMLElement) {
			this.element = element;
			return true;
		} else if (typeof element === "string") {
			this.element = document.querySelector(element);

			if (this.element) {
				return true;
			} else {
				console.error("Tabulator Creation Error - no element found matching selector: ", element);
				return false;
			}
		} else {
			console.error("Tabulator Creation Error - Invalid element provided:", element);
			return false;
		}
	}

	// 初始化核心系统
	initializeCoreSystems(options) {
		this.columnManager = new ColumnManager(this);
		this.rowManager = new RowManager(this);
		this.footerManager = new FooterManager(this);
		this.dataLoader = new DataLoader(this);
		this.alertManager = new Alert(this);

		this.bindModules();

		this.options = this.optionsList.generate(Tabulator.defaultOptions, options);

		this._clearObjectPointers();

		this._mapDeprecatedFunctionality();

		this.externalEvents = new ExternalEventBus(this, this.options, this.options.debugEventsExternal);
		this.eventBus = new InternalEventBus(this.options.debugEventsInternal);

		this.interactionMonitor = new InteractionMonitor(this);

		this.dataLoader.initialize();
		// this.columnManager.initialize();
		// this.rowManager.initialize();
		this.footerManager.initialize();
	}

	// 将弃用的功能转换为新的函数
	_mapDeprecatedFunctionality() {
		// 所有之前弃用的功能都在 5.0 版本中删除
	}

	_clearSelection() {

		this.element.classList.add("tabulator-block-select");

		// 清除任何现有的选择
		if (window.getSelection) {
			if (window.getSelection().empty) {  // Chrome
				window.getSelection().empty();
			} else if (window.getSelection().removeAllRanges) {  // Firefox
				window.getSelection().removeAllRanges();
			}
		} else if (document.selection) {  // IE?
			document.selection.empty();
		}

		this.element.classList.remove("tabulator-block-select");
	}

	// 创建表格
	_create() {
		this.externalEvents.dispatch("tableBuilding");
		this.eventBus.dispatch("table-building");

		this._rtlCheck();

		this._buildElement();

		this._initializeTable();

		this._loadInitialData();

		this.initialized = true;

		this.externalEvents.dispatch("tableBuilt");
	}

	_rtlCheck() {
		var style = window.getComputedStyle(this.element);

		switch (this.options.textDirection) {
			case "auto":
				if (style.direction !== "rtl") {
					break;
				}

			case "rtl":
				this.element.classList.add("tabulator-rtl");
				this.rtl = true;
				break;

			case "ltr":
				this.element.classList.add("tabulator-ltr");

			default:
				this.rtl = false;
		}
	}

	// 清除默认配置对象中的对象指针
	_clearObjectPointers() {
		this.options.columns = this.options.columns.slice(0);
		// TODO: 为什么要复制一份 data?
		if (Array.isArray(this.options.data) && !this.options.reactiveData) {
			this.options.data = this.options.data.slice(0);
		}
	}

	// 构建 Tabulator 元素
	_buildElement() {
		var element = this.element,
			options = this.options,
			newElement;

		if (element.tagName === "TABLE") {
			this.originalElement = this.element;
			newElement = document.createElement("div");

			// 将原有的属性复制到新的 div 元素上
			var attributes = element.attributes;
			for (var i in attributes) {
				if (typeof attributes[i] == "object") {
					newElement.setAttribute(attributes[i].name, attributes[i].value);
				}
			}

			// 将新的 div 元素替换目标元素
			element.parentNode.replaceChild(newElement, element);

			this.element = element = newElement;
		}

		element.classList.add("tabulator");
		element.setAttribute("role", "grid");	// 参考https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/grid_role

		// 清空元素
		while (element.firstChild) element.removeChild(element.firstChild);

		// 设置表格高度
		if (options.height) {
			options.height = isNaN(options.height)
				? options.height
				: options.height + "px";
			element.style.height = options.height;
		}

		// 设置表格的最小高度
		if (options.minHeight !== false) {
			options.minHeight = isNaN(options.minHeight)
				? options.minHeight
				: options.minHeight + "px";
			element.style.minHeight = options.minHeight;
		}

		// 设置表格的最大高度
		if (options.maxHeight !== false) {
			options.maxHeight = isNaN(options.maxHeight)
				? options.maxHeight
				: options.maxHeight + "px";
			element.style.maxHeight = options.maxHeight;
		}
	}

	// 初始化核心系统和模块
	_initializeTable() {
		var element = this.element,
			options = this.options;

		this.interactionMonitor.initialize();

		this.columnManager.initialize();
		this.rowManager.initialize();

		this._detectBrowser();

		// 初始化核心模块
		this.modulesCore.forEach((mod) => {
			mod.initialize();
		});

		// 将 columnManager 和 rowManager 元素添加到 DOM 中
		element.appendChild(this.columnManager.getElement());
		element.appendChild(this.rowManager.getElement());

		if (options.footerElement) {
			this.footerManager.activate();
		}

		if (options.autoColumns && options.data) {
			this.columnManager.generateColumnsFromRowData(this.options.data);
		}

		// 初始化常规模块
		this.modulesRegular.forEach((mod) => {
			mod.initialize();
		});

		this.columnManager.setColumns(options.columns);

		this.eventBus.dispatch("table-built");
	}

	_loadInitialData() {
		this.dataLoader.load(this.options.data);
	}

	// 摧毁表格
	destroy() {
		var element = this.element;

		this.destroyed = true;

		TableRegistry.deregister(this); //deregister table from inter-device communication

		this.eventBus.dispatch("table-destroy");

		// 清除行数据
		this.rowManager.destroy();

		// 清除 DOM 元素
		while (element.firstChild) element.removeChild(element.firstChild);
		element.classList.remove("tabulator");

		this.externalEvents.dispatch("tableDestroyed");
	}

	// 识别浏览器
	_detectBrowser() {
		var ua = navigator.userAgent || navigator.vendor || window.opera;

		if (ua.indexOf("Trident") > -1) {
			this.browser = "ie";
			this.browserSlow = true;
		} else if (ua.indexOf("Edge") > -1) {
			this.browser = "edge";
			this.browserSlow = true;
		} else if (ua.indexOf("Firefox") > -1) {
			this.browser = "firefox";
			this.browserSlow = false;
		} else if (ua.indexOf("Mac OS") > -1) {
			this.browser = "safari";
			this.browserSlow = false;
		} else {
			this.browser = "other";
			this.browserSlow = false;
		}

		this.browserMobile = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(ua) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw-(n|u)|c55\/|capi|ccwa|cdm-|cell|chtm|cldc|cmd-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc-s|devi|dica|dmob|do(c|p)o|ds(12|-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(-|_)|g1 u|g560|gene|gf-5|g-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd-(m|p|t)|hei-|hi(pt|ta)|hp( i|ip)|hs-c|ht(c(-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i-(20|go|ma)|i230|iac( |-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|-[a-w])|libw|lynx|m1-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|-([1-8]|c))|phil|pire|pl(ay|uc)|pn-2|po(ck|rt|se)|prox|psio|pt-g|qa-a|qc(07|12|21|32|60|-[2-7]|i-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h-|oo|p-)|sdk\/|se(c(-|0|1)|47|mc|nd|ri)|sgh-|shar|sie(-|m)|sk-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h-|v-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl-|tdg-|tel(i|m)|tim-|t-mo|to(pl|sh)|ts(70|m-|m3|m5)|tx-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas-|your|zeto|zte-/i.test(ua.slice(0, 4));
	}

	// 表格初始化之前阻止调用某些方法来保证表格的一致性
	initGuard(func, msg) {
		var stack, line;

		if (this.options.debugInitialization && !this.initialized) {
			if (!func) {
				stack = new Error().stack.split("\n");

				line = stack[0] == "Error" ? stack[2] : stack[1];

				if (line[0] == " ") {
					func = line.trim().split(" ")[1].split(".")[1];
				} else {
					func = line.trim().split("@")[0];
				}
			}

			console.warn("Table Not Initialized - Calling the " + func + " function before the table is initialized may result in inconsistent behavior, Please wait for the `tableBuilt` event before calling this function." + (msg ? " " + msg : ""));
		}

		return this.initialized;
	}

	////////////////// Data Handling //////////////////
	// 阻止表格重绘
	blockRedraw() {
		this.initGuard();

		this.eventBus.dispatch("redraw-blocking");

		this.rowManager.blockRedraw();
		this.columnManager.blockRedraw();

		this.eventBus.dispatch("redraw-blocked");
	}

	// 撤销表格重绘
	restoreRedraw() {
		this.initGuard();

		this.eventBus.dispatch("redraw-restoring");

		this.rowManager.restoreRedraw();
		this.columnManager.restoreRedraw();

		this.eventBus.dispatch("redraw-restored");
	}

	// 加载数据
	setData(data, params, config) {
		this.initGuard(false, "To set initial data please use the 'data' property in the table constructor.");

		return this.dataLoader.load(data, params, config, false);
	}

	// 清除数据
	clearData() {
		this.initGuard();

		this.dataLoader.blockActiveLoad();
		this.rowManager.clearData();
	}

	// 获得表格数据列表
	getData(active) {
		return this.rowManager.getData(active);
	}

	// 获得表格数据的数量
	getDataCount(active) {
		return this.rowManager.getDataCount(active);
	}

	// 替换数据, 保持表格在相同的排序位置
	replaceData(data, params, config) {
		this.initGuard();

		return this.dataLoader.load(data, params, config, true, true);
	}

	// 更新表格数据
	updateData(data) {
		var responses = 0;	// 用于跟踪更新的行数

		this.initGuard();

		return new Promise((resolve, reject) => {
			this.dataLoader.blockActiveLoad();

			if (typeof data === "string") {
				data = JSON.parse(data);
			}

			if (data && data.length > 0) {
				data.forEach((item) => {
					// 根据指定的索引字段值, 查找行
					var row = this.rowManager.findRow(item[this.options.index]);

					if (row) {
						responses++;

						row.updateData(item)
							.then(() => {
								responses--;

								if (!responses) {
									resolve();
								}
							})
							.catch((e) => {
								reject("Update Error - Unable to update row", item, e);
							});
					} else {
						reject("Update Error - Unable to find row", item);
					}
				});
			} else {
				console.warn("Update Error - No data provided");
				reject("Update Error - No data provided");
			}
		});
	}

	// 添加数据到指定位置, 调用 rowManager.addRows
	addData(data, pos, index) {
		this.initGuard();

		return new Promise((resolve, reject) => {
			this.dataLoader.blockActiveLoad();

			if (typeof data === "string") {
				data = JSON.parse(data);
			}

			if (data) {
				this.rowManager.addRows(data, pos, index)
					.then((rows) => {
						var output = [];

						rows.forEach(function (row) {
							output.push(row.getComponent());
						});

						resolve(output);
					});
			} else {
				console.warn("Update Error - No data provided");
				reject("Update Error - No data provided");
			}
		});
	}

	// 更新表格数据, 如果不存在则创建
	updateOrAddData(data) {
		var rows = [],
			responses = 0;

		this.initGuard();

		return new Promise((resolve, reject) => {
			this.dataLoader.blockActiveLoad();

			if (typeof data === "string") {
				data = JSON.parse(data);
			}

			if (data && data.length > 0) {
				data.forEach((item) => {
					var row = this.rowManager.findRow(item[this.options.index]);

					responses++;

					if (row) {
						row.updateData(item)
							.then(() => {
								responses--;
								rows.push(row.getComponent());

								if (!responses) {
									resolve(rows);
								}
							});
					} else {
						this.rowManager.addRows(item)
							.then((newRows) => {
								responses--;
								rows.push(newRows[0].getComponent());

								if (!responses) {
									resolve(rows);
								}
							});
					}
				});
			} else {
				console.warn("Update Error - No data provided");
				reject("Update Error - No data provided");
			}
		});
	}

	// 获得索引获得行对象
	getRow(index) {
		var row = this.rowManager.findRow(index);

		if (row) {
			return row.getComponent();
		} else {
			console.warn("Find Error - No matching row found:", index);
			return false;
		}
	}

	// 通过位置获得行对象
	getRowFromPosition(position) {
		var row = this.rowManager.getRowFromPosition(position);

		if (row) {
			return row.getComponent();
		} else {
			console.warn("Find Error - No matching row found:", position);
			return false;
		}
	}

	//delete row from table
	deleteRow(index) {
		var foundRows = [];

		this.initGuard();

		if (!Array.isArray(index)) {
			index = [index];
		}

		//find matching rows
		for (let item of index) {
			let row = this.rowManager.findRow(item, true);

			if (row) {
				foundRows.push(row);
			} else {
				console.error("Delete Error - No matching row found:", item);
				return Promise.reject("Delete Error - No matching row found");
			}
		}

		//sort rows into correct order to ensure smooth delete from table
		foundRows.sort((a, b) => {
			return this.rowManager.rows.indexOf(a) > this.rowManager.rows.indexOf(b) ? 1 : -1;
		});

		//delete rows
		foundRows.forEach((row) => {
			row.delete();
		});

		this.rowManager.reRenderInPosition();

		return Promise.resolve();
	}

	//add row to table
	addRow(data, pos, index) {
		this.initGuard();

		if (typeof data === "string") {
			data = JSON.parse(data);
		}

		return this.rowManager.addRows(data, pos, index, true)
			.then((rows) => {
				return rows[0].getComponent();
			});
	}

	//update a row if it exists otherwise create it
	updateOrAddRow(index, data) {
		var row = this.rowManager.findRow(index);

		this.initGuard();

		if (typeof data === "string") {
			data = JSON.parse(data);
		}

		if (row) {
			return row.updateData(data)
				.then(() => {
					return row.getComponent();
				});
		} else {
			return this.rowManager.addRows(data)
				.then((rows) => {
					return rows[0].getComponent();
				});
		}
	}

	//update row data
	updateRow(index, data) {
		var row = this.rowManager.findRow(index);

		this.initGuard();

		if (typeof data === "string") {
			data = JSON.parse(data);
		}

		if (row) {
			return row.updateData(data)
				.then(() => {
					return Promise.resolve(row.getComponent());
				});
		} else {
			console.warn("Update Error - No matching row found:", index);
			return Promise.reject("Update Error - No matching row found");
		}
	}

	//scroll to row in DOM
	scrollToRow(index, position, ifVisible) {
		var row = this.rowManager.findRow(index);

		if (row) {
			return this.rowManager.scrollToRow(row, position, ifVisible);
		} else {
			console.warn("Scroll Error - No matching row found:", index);
			return Promise.reject("Scroll Error - No matching row found");
		}
	}

	moveRow(from, to, after) {
		var fromRow = this.rowManager.findRow(from);

		this.initGuard();

		if (fromRow) {
			fromRow.moveToRow(to, after);
		} else {
			console.warn("Move Error - No matching row found:", from);
		}
	}

	getRows(active) {
		return this.rowManager.getComponents(active);
	}

	// 根据索引获得行在表格中的位置
	getRowPosition(index) {
		var row = this.rowManager.findRow(index);

		if (row) {
			return row.getPosition();
		} else {
			console.warn("Position Error - No matching row found:", index);
			return false;
		}
	}

	/////////////// Column Functions  ///////////////
	setColumns(definition) {
		this.initGuard(false, "To set initial columns please use the 'columns' property in the table constructor");

		this.columnManager.setColumns(definition);
	}

	getColumns(structured) {
		return this.columnManager.getComponents(structured);
	}

	getColumn(field) {
		var column = this.columnManager.findColumn(field);

		if (column) {
			return column.getComponent();
		} else {
			console.warn("Find Error - No matching column found:", field);
			return false;
		}
	}

	// 获得表格列的定义
	getColumnDefinitions() {
		return this.columnManager.getDefinitionTree();
	}

	// 显示列
	showColumn(field) {
		var column = this.columnManager.findColumn(field);

		this.initGuard();

		if (column) {
			column.show();
		} else {
			console.warn("Column Show Error - No matching column found:", field);
			return false;
		}
	}

	// 隐藏列
	hideColumn(field) {
		var column = this.columnManager.findColumn(field);

		this.initGuard();

		if (column) {
			column.hide();
		} else {
			console.warn("Column Hide Error - No matching column found:", field);
			return false;
		}
	}

	// 切换列
	toggleColumn(field) {
		var column = this.columnManager.findColumn(field);

		this.initGuard();

		if (column) {
			if (column.visible) {
				column.hide();
			} else {
				column.show();
			}
		} else {
			console.warn("Column Visibility Toggle Error - No matching column found:", field);
			return false;
		}
	}

	// 添加列
	addColumn(definition, before, field) {
		var column = this.columnManager.findColumn(field);

		this.initGuard();

		return this.columnManager.addColumn(definition, before, column)
			.then((column) => {
				return column.getComponent();
			});
	}

	// 删除列
	deleteColumn(field) {
		var column = this.columnManager.findColumn(field);

		this.initGuard();

		if (column) {
			return column.delete();
		} else {
			console.warn("Column Delete Error - No matching column found:", field);
			return Promise.reject();
		}
	}

	// 更新列定义
	updateColumnDefinition(field, definition) {
		var column = this.columnManager.findColumn(field);

		this.initGuard();

		if (column) {
			return column.updateDefinition(definition);
		} else {
			console.warn("Column Update Error - No matching column found:", field);
			return Promise.reject();
		}
	}

	// 移动列
	moveColumn(from, to, after) {
		var fromColumn = this.columnManager.findColumn(from),
			toColumn = this.columnManager.findColumn(to);

		this.initGuard();

		if (fromColumn) {
			if (toColumn) {
				this.columnManager.moveColumn(fromColumn, toColumn, after);
			} else {
				console.warn("Move Error - No matching column found:", toColumn);
			}
		} else {
			console.warn("Move Error - No matching column found:", from);
		}
	}

	// 滚动到指定列
	scrollToColumn(field, position, ifVisible) {
		return new Promise((resolve, reject) => {
			var column = this.columnManager.findColumn(field);

			if (column) {
				return this.columnManager.scrollToColumn(column, position, ifVisible);
			} else {
				console.warn("Scroll Error - No matching column found:", field);
				return Promise.reject("Scroll Error - No matching column found");
			}
		});
	}

	//////////// General Public Functions ////////////
	// 不更新数据!的情况下重绘列表
	redraw(force) {
		this.initGuard();

		this.columnManager.redraw(force);
		this.rowManager.redraw(force);
	}

	// 设置高度并重绘表格
	setHeight(height) {
		this.options.height = isNaN(height) ? height : height + "px";
		this.element.style.height = this.options.height;
		this.rowManager.initializeRenderer();
		this.rowManager.redraw();
	}

	//////////////////// Event Bus ///////////////////
	// 事件总线的操作
	on(key, callback) {
		this.externalEvents.subscribe(key, callback);
	}

	off(key, callback) {
		this.externalEvents.unsubscribe(key, callback);
	}

	dispatchEvent() {
		var args = Array.from(arguments);
		args.shift();

		this.externalEvents.dispatch(...arguments);
	}

	//////////////////// Alerts ///////////////////

	alert(contents, type) {
		this.initGuard();

		this.alertManager.alert(contents, type);
	}

	clearAlert() {
		this.initGuard();

		this.alertManager.clear();
	}

	////////////// Extension Management //////////////
	modExists(plugin, required) {
		if (this.modules[plugin]) {
			return true;
		} else {
			if (required) {
				console.error("Tabulator Module Not Installed: " + plugin);
			}
			return false;
		}
	}

	module(key) {
		var mod = this.modules[key];

		if (!mod) {
			console.error("Tabulator module not installed: " + key);
		}

		return mod;
	}
}

//default setup options
Tabulator.defaultOptions = defaultOptions;

//bind modules and static functionality
new ModuleBinder(Tabulator);

export default Tabulator;
