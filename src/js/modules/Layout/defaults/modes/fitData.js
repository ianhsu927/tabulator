// 适应数据
export default function (columns, forced) {
	if (forced) {
		// 重新初始化列宽
		this.table.columnManager.renderer.reinitializeColumnWidths(columns);
	}

	// 响应式布局, 需要先判断是否包含响应式布局模块, 并调用其 update 方法
	if (this.table.options.responsiveLayout && this.table.modExists("responsiveLayout", true)) {
		this.table.modules.responsiveLayout.update();
	}
}
