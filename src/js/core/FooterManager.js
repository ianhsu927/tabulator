import CoreFeature from './CoreFeature.js';

export default class FooterManager extends CoreFeature {

	constructor(table) {
		super(table);

		this.active = false;
		this.element = this.createElement(); //containing element
		this.containerElement = this.createContainerElement(); //containing element
		this.external = false;	// external 标记是否是外部元素
	}

	initialize() {
		this.initializeElement();
	}

	createElement() {
		var el = document.createElement("div");

		el.classList.add("tabulator-footer");

		return el;
	}


	createContainerElement() {
		var el = document.createElement("div");

		el.classList.add("tabulator-footer-contents");

		this.element.appendChild(el);

		return el;
	}

	initializeElement() {
		if (this.table.options.footerElement) {
			// 如果给定 footerElement, 则将其添加到表格中
			switch (typeof this.table.options.footerElement) {
				case "string":
					// 字符串转换成 HTML 元素
					if (this.table.options.footerElement[0] === "<") {
						this.containerElement.innerHTML = this.table.options.footerElement;
					} else {
						this.external = true;
						this.containerElement = document.querySelector(this.table.options.footerElement);
					}
					break;

				default:
					// 如果自定义的 footerElement 不是字符串, 则将其赋值给 footer 的容器元素
					this.element = this.table.options.footerElement;
					break;
			}
		}
	}

	getElement() {
		return this.element;
	}

	append(element) {
		this.activate();

		this.containerElement.appendChild(element);
		this.table.rowManager.adjustTableSize();
	}

	prepend(element) {
		this.activate();

		this.element.insertBefore(element, this.element.firstChild);
		this.table.rowManager.adjustTableSize();
	}

	remove(element) {
		element.parentNode.removeChild(element);
		this.deactivate();
	}

	deactivate(force) {
		if (!this.element.firstChild || force) {
			if (!this.external) {
				this.element.parentNode.removeChild(this.element);
			}
			this.active = false;
		}
	}

	activate() {
		if (!this.active) {
			this.active = true;
			if (!this.external) {
				this.table.element.appendChild(this.getElement());
				this.table.element.style.display = '';
			}
		}
	}

	redraw() {
		this.dispatch("footer-redraw");
	}
}
