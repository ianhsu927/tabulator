/* 通过构造 URL, 生成请求地址
HTTP 方法留空时使用 get, 通过 params 生成 url 字符串, url?params=xxx&params=xxx
*/
function generateParamsList(data, prefix) {
	var output = [];

	prefix = prefix || "";

	if (Array.isArray(data)) {
		data.forEach((item, i) => {
			output = output.concat(generateParamsList(item, prefix ? prefix + "[" + i + "]" : i));
		});
	} else if (typeof data === "object") {
		for (var key in data) {
			output = output.concat(generateParamsList(data[key], prefix ? prefix + "[" + key + "]" : key));
		}
	} else {
		output.push({ key: prefix, value: data });
	}

	return output;
}

// 序列化参数
function serializeParams(params) {
	var output = generateParamsList(params),
		encoded = [];

	output.forEach(function (item) {
		encoded.push(encodeURIComponent(item.key) + "=" + encodeURIComponent(item.value));
	});

	return encoded.join("&");
}

export default function (url, config, params) {
	if (url) {
		if (params && Object.keys(params).length) {
			if (!config.method || config.method.toLowerCase() == "get") {
				config.method = "get";
				// 如果 URL 已经包含路径参数, 则使用 & 
				url += (url.includes("?") ? "&" : "?") + serializeParams(params);
			}
		}
	}

	return url;
}
