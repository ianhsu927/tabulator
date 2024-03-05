// 适应数据并舒张?行以填充表格, 也用于适应数据表
export default function (columns, forced) {
	columns.forEach(function (column) {
		column.reinitializeWidth();	// 重新初始化列宽
	});

	if (this.table.options.responsiveLayout && this.table.modExists("responsiveLayout", true)) {
		this.table.modules.responsiveLayout.update();
	}
}
