//tabulator with all modules installed
import { default as Tabulator } from './Tabulator.js';
import * as modules from '../core/modules/optional.js';
import ModuleBinder from './tools/ModuleBinder.js';

class TabulatorFull extends Tabulator { }

// 将所有模块和静态方法与 Tabulator 绑定
new ModuleBinder(TabulatorFull, modules);

export default TabulatorFull;
