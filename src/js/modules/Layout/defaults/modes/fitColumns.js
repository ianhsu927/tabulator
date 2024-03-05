// 自适应
export default function (columns, forced) {
	var totalWidth = this.table.rowManager.element.getBoundingClientRect().width; // table 元素宽度
	var fixedWidth = 0; // 通过定义一个固定的宽度设置表格总宽度
	// flex
	var flexWidth = 0; // 灵活列可用的总宽度
	var flexGrowUnits = 0; // 所有列中宽度增长块的总数
	var flexColWidth = 0; // 灵活列的期望宽度”
	var flexColumns = []; // 灵活宽度列的数组
	var fixedShrinkColumns = []; // 可以缩小的固定宽度列的数组
	var flexShrinkUnits = 0; // 所有列中宽度缩减块的总数
	var overflowWidth = 0; // 水平 overflow 宽度
	var gapFill = 0; // 为了关闭半像素间隙需要添加到最后一列的像素数

	// 计算列宽
	function calcWidth(width) {
		var colWidth;

		if (typeof (width) == "string") {
			if (width.indexOf("%") > -1) {	// width 是百分比, 计算总宽 * 百分比
				colWidth = (totalWidth / 100) * parseInt(width);
			} else {
				colWidth = parseInt(width);
			}
		} else {
			colWidth = width;
		}

		return colWidth;
	}

	// 保证列调整大小以占用正确的空间
	function scaleColumns(columns, freeSpace, colWidth, shrinkCols) {
		var oversizeCols = [],
			oversizeSpace = 0,
			remainingSpace = 0,
			nextColWidth = 0,
			remainingFlexGrowUnits = flexGrowUnits,
			gap = 0,
			changeUnits = 0,
			undersizeCols = [];

		function calcGrow(col) {
			return (colWidth * (col.column.definition.widthGrow || 1));
		}

		function calcShrink(col) {
			return (calcWidth(col.width) - (colWidth * (col.column.definition.widthShrink || 0)));
		}

		columns.forEach(function (col, i) {
			var width = shrinkCols ? calcShrink(col) : calcGrow(col);
			if (col.column.minWidth >= width) {
				oversizeCols.push(col);
			} else {
				if (col.column.maxWidth && col.column.maxWidth < width) {
					col.width = col.column.maxWidth;
					freeSpace -= col.column.maxWidth;

					remainingFlexGrowUnits -= shrinkCols ? (col.column.definition.widthShrink || 1) : (col.column.definition.widthGrow || 1);

					if (remainingFlexGrowUnits) {
						colWidth = Math.floor(freeSpace / remainingFlexGrowUnits);
					}
				} else {
					undersizeCols.push(col);
					changeUnits += shrinkCols ? (col.column.definition.widthShrink || 1) : (col.column.definition.widthGrow || 1);
				}
			}
		});

		if (oversizeCols.length) {
			oversizeCols.forEach(function (col) {
				oversizeSpace += shrinkCols ? col.width - col.column.minWidth : col.column.minWidth;
				col.width = col.column.minWidth;
			});

			remainingSpace = freeSpace - oversizeSpace;

			nextColWidth = changeUnits ? Math.floor(remainingSpace / changeUnits) : remainingSpace;

			gap = scaleColumns(undersizeCols, remainingSpace, nextColWidth, shrinkCols);
		} else {
			gap = changeUnits ? freeSpace - (Math.floor(freeSpace / changeUnits) * changeUnits) : freeSpace;

			undersizeCols.forEach(function (column) {
				column.width = shrinkCols ? calcShrink(column) : calcGrow(column);
			});
		}

		return gap;
	}

	if (this.table.options.responsiveLayout && this.table.modExists("responsiveLayout", true)) {
		this.table.modules.responsiveLayout.update();
	}

	// 调整垂直滚动条
	if (this.table.rowManager.element.scrollHeight > this.table.rowManager.element.clientHeight) {
		totalWidth -= this.table.rowManager.element.offsetWidth - this.table.rowManager.element.clientWidth;
	}

	columns.forEach(function (column) {
		var width, minWidth, colWidth;

		if (column.visible) {

			width = column.definition.width;
			minWidth = parseInt(column.minWidth);

			if (width) {

				colWidth = calcWidth(width);

				fixedWidth += colWidth > minWidth ? colWidth : minWidth;

				if (column.definition.widthShrink) {
					fixedShrinkColumns.push({
						column: column,
						width: colWidth > minWidth ? colWidth : minWidth
					});
					flexShrinkUnits += column.definition.widthShrink;
				}

			} else {
				flexColumns.push({
					column: column,
					width: 0,
				});
				flexGrowUnits += column.definition.widthGrow || 1;
			}
		}
	});

	// 计算可用空间
	flexWidth = totalWidth - fixedWidth;

	// 计算正确的列宽
	flexColWidth = Math.floor(flexWidth / flexGrowUnits);

	// 生成列宽
	gapFill = scaleColumns(flexColumns, flexWidth, flexColWidth, false);

	// 增加最后一列的宽度以解决四舍五入误差
	if (flexColumns.length && gapFill > 0) {
		flexColumns[flexColumns.length - 1].width += gapFill;
	}

	// 计算列的空间以缩小
	flexColumns.forEach(function (col) {
		flexWidth -= col.width;
	});

	overflowWidth = Math.abs(gapFill) + flexWidth;

	// 没有可用空间的情况下, 缩小超大列
	if (overflowWidth > 0 && flexShrinkUnits) {
		gapFill = scaleColumns(fixedShrinkColumns, overflowWidth, Math.floor(overflowWidth / flexShrinkUnits), true);
	}

	// 减小最后一列的宽度以解决四舍五入误差
	if (gapFill && fixedShrinkColumns.length) {
		fixedShrinkColumns[fixedShrinkColumns.length - 1].width -= gapFill;
	}

	flexColumns.forEach(function (col) {
		col.column.setWidth(col.width);
	});

	fixedShrinkColumns.forEach(function (col) {
		col.column.setWidth(col.width);
	});
}
