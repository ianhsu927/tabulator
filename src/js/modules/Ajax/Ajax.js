import Module from '../../core/Module.js';

import defaultConfig from './defaults/config.js';	// 默认 GET
import defaultURLGenerator from './defaults/urlGenerator.js';
import defaultLoaderPromise from './defaults/loaderPromise.js';
import defaultContentTypeFormatters from './defaults/contentTypeFormatters.js';

class Ajax extends Module {

	constructor(table) {
		super(table);

		this.config = {}; // 持有用于AJAX请求的配置对象
		this.url = ""; // 请求 URL
		this.urlGenerator = false;
		this.params = false; // 请求参数

		this.loaderPromise = false;

		this.registerTableOption("ajaxURL", false); // 用于 ajax 加载的 URL
		this.registerTableOption("ajaxURLGenerator", false);
		this.registerTableOption("ajaxParams", {});  // 用于 ajax 加载的参数
		this.registerTableOption("ajaxConfig", "get"); // ajax 请求方法
		this.registerTableOption("ajaxContentType", "form"); // ajax 请求类型
		this.registerTableOption("ajaxRequestFunc", false); // promise 函数

		this.registerTableOption("ajaxRequesting", function () { });
		this.registerTableOption("ajaxResponse", false);

		this.contentTypeFormatters = Ajax.contentTypeFormatters;
	}

	// 初始化设置选项
	initialize() {
		// 使用自定义的 ajax 请求函数 or url 构造器
		this.loaderPromise = this.table.options.ajaxRequestFunc || Ajax.defaultLoaderPromise;
		this.urlGenerator = this.table.options.ajaxURLGenerator || Ajax.defaultURLGenerator;

		// 如果存在 ajaxURL, 则设置请求 URL
		if (this.table.options.ajaxURL) {
			this.setUrl(this.table.options.ajaxURL);
		}


		this.setDefaultConfig(this.table.options.ajaxConfig);

		this.registerTableFunction("getAjaxUrl", this.getUrl.bind(this));

		this.subscribe("data-loading", this.requestDataCheck.bind(this));
		this.subscribe("data-params", this.requestParams.bind(this));
		this.subscribe("data-load", this.requestData.bind(this));
	}

	// 请求参数, 合并了 ajaxParams 和 params
	requestParams(data, config, silent, params) {
		var ajaxParams = this.table.options.ajaxParams;

		if (ajaxParams) {
			if (typeof ajaxParams === "function") {	// ajaxParams 可以是函数?
				ajaxParams = ajaxParams.call(this.table);
			}
			params = Object.assign(Object.assign({}, ajaxParams), params);
		}

		return params;
	}

	// 请求数据检查
	requestDataCheck(data, params, config, silent) {
		// !! 可以用于判断是否存在 URL, 返回值一定是布尔值
		return !!((!data && this.url) || typeof data === "string");
	}

	// 请求数据
	requestData(url, params, config, silent, previousData) {
		var ajaxConfig;

		if (!previousData && this.requestDataCheck(url)) {
			if (url) {
				this.setUrl(url);
			}

			ajaxConfig = this.generateConfig(config);

			return this.sendRequest(this.url, params, ajaxConfig);
		} else {
			return previousData;
		}
	}

	setDefaultConfig(config = {}) {
		this.config = Object.assign({}, Ajax.defaultConfig);

		if (typeof config == "string") {
			this.config.method = config;
		} else {
			Object.assign(this.config, config);
		}
	}

	//load config object
	generateConfig(config = {}) {
		var ajaxConfig = Object.assign({}, this.config);

		if (typeof config == "string") {
			ajaxConfig.method = config;
		} else {
			Object.assign(ajaxConfig, config);
		}

		return ajaxConfig;
	}

	//set request url
	setUrl(url) {
		this.url = url;
	}

	//get request url
	getUrl() {
		return this.url;
	}

	// 发送 ajax 请求
	sendRequest(url, params, config) {
		if (this.table.options.ajaxRequesting.call(this.table, url, params) !== false) {
			return this.loaderPromise(url, config, params)
				.then((data) => {
					// 如果存在自定义的 ajaxResponse 函数, 则调用
					if (this.table.options.ajaxResponse) {
						data = this.table.options.ajaxResponse.call(this.table, url, params, data);
					}
					return data;
				});
		} else {
			return Promise.reject();
		}
	}
}

Ajax.moduleName = "ajax";

// 加载默认值
Ajax.defaultConfig = defaultConfig;
Ajax.defaultURLGenerator = defaultURLGenerator;
Ajax.defaultLoaderPromise = defaultLoaderPromise;
Ajax.contentTypeFormatters = defaultContentTypeFormatters;

export default Ajax;
