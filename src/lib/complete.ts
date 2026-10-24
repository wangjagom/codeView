import { keywordsFor } from './highlight';
import { fillTemplate, templatesFor } from './templates';

/** 자동완성 항목 종류. 목록 왼쪽 아이콘과 정렬 순서에 써요. */
export type Kind = 'tpl' | 'snip' | 'kw' | 'tag' | 'attr' | 'prop' | 'val' | 'fn' | 'cls' | 'mod' | 'word';

export interface Item {
  label: string;
  /** 넣을 글. VS Code 스니펫처럼 ${1:이름}은 넣은 뒤 골라 두고, $0은 커서 자리예요. */
  insert: string;
  kind: Kind;
  detail?: string;
}

export interface Suggestion {
  /** 바꿀 범위 시작 (지금 쓰고 있는 낱말의 첫 글자) */
  from: number;
  prefix: string;
  items: Item[];
}

type Snip = [label: string, body: string, detail?: string];
const snips = (list: Snip[]): Item[] => list.map(([label, insert, detail]) => ({ label, insert, kind: 'snip', detail }));
const plain = (kind: Kind, list: string[], detail?: string): Item[] => list.map((label) => ({ label, insert: label, kind, detail }));

/* ───────── ABAP ───────── */
const ABAP_SNIPS = snips([
  ['if', 'if ${1:condition}.\n  $0\nendif.'],
  ['if … else', 'if ${1:condition}.\n  $0\nelse.\n\nendif.'],
  ['loop at … into', 'loop at ${1:lt_rows} into data(${2:ls_row}).\n  $0\nendloop.'],
  ['loop at … assigning', 'loop at ${1:lt_rows} assigning field-symbol(<${2:ls_row}>).\n  $0\nendloop.'],
  ['select … into table', 'select ${1:field1, field2}\n  from ${2:dbtab}\n  where ${3:condition}\n  into table @data(${4:lt_rows}).'],
  ['select single', 'select single ${1:field1}\n  from ${2:dbtab}\n  where ${3:key} = @${4:lv_key}\n  into @data(${5:ls_row}).'],
  ['read table … with key', 'read table ${1:lt_rows} into data(${2:ls_row}) with key ${3:field} = ${4:lv_value}.'],
  ['data', 'data ${1:lv_name} type ${2:string}.'],
  ['data … table', 'data ${1:lt_rows} type standard table of ${2:ty_row} with empty key.'],
  ['types: begin of', 'types: begin of ${1:ty_row},\n         ${2:field} type ${3:string},\n       end of ty_row.'],
  ['case', 'case ${1:lv_value}.\n  when ${2:\'A\'}.\n    $0\n  when others.\n\nendcase.'],
  ['do … times', 'do ${1:3} times.\n  $0\nenddo.'],
  ['while', 'while ${1:condition}.\n  $0\nendwhile.'],
  ['try … catch', 'try.\n    $0\n  catch ${1:cx_root} into data(${2:lx_error}).\n    message lx_error->get_text( ) type \'E\'.\nendtry.'],
  ['method', 'method ${1:name}.\n  $0\nendmethod.'],
  ['methods', 'methods ${1:name}\n  importing ${2:iv_value} type ${3:string}\n  returning value(${4:rv_result}) type ${5:string}.'],
  ['class … definition', 'class ${1:zcl_name} definition\n  public\n  final\n  create public.\n\n  public section.\n    $0\n  protected section.\n  private section.\nendclass.\n\nclass zcl_name implementation.\nendclass.'],
  ['report', 'report ${1:zr_name}.'],
  ['parameters', 'parameters ${1:p_name} type ${2:string}.'],
  ['select-options', 'select-options ${1:s_name} for ${2:dbtab-field}.'],
  ['field-symbols', 'field-symbols <${1:ls_row}> type ${2:any}.'],
  ['append … to', 'append ${1:ls_row} to ${2:lt_rows}.'],
  ['modify … from', 'modify ${1:dbtab} from ${2:ls_row}.'],
  ['message … type', 'message ${1:\'text\'} type ${2:\'S\'}.'],
  ['write', 'write: / ${1:lv_text}.'],
  ['value #( )', 'value #( ( ${1:field} = ${2:lv_value} ) )'],
  ['cond #( )', 'cond #( when ${1:condition} then ${2:a} else ${3:b} )'],
  ['new #( )', 'new #( $0 )'],
  ['start-of-selection', 'start-of-selection.\n  $0'],
  ['form', 'form ${1:name}.\n  $0\nendform.'],
]);
const ABAP_EXTRA = plain('kw', ['sy-subrc', 'sy-tabix', 'sy-datum', 'sy-uzeit', 'sy-uname', 'sy-index', 'sy-langu', 'abap_true', 'abap_false', 'is initial', 'is not initial', 'line_exists( )', 'lines( )', 'string', 'i', 'p', 'c', 'n', 'd', 't', 'abap_bool', 'xsdboolean']);

/* ───────── CDS ───────── */
const CDS_SNIPS = snips([
  ['define view entity', "@AccessControl.authorizationCheck: #NOT_REQUIRED\n@EndUserText.label: '${1:설명}'\ndefine view entity ${2:ZI_Name}\n  as select from ${3:dbtab}\n{\n  key ${4:field} as ${5:Alias},\n      $0\n}"],
  ['define root view entity', "@AccessControl.authorizationCheck: #NOT_REQUIRED\n@EndUserText.label: '${1:설명}'\ndefine root view entity ${2:ZR_Name}\n  as select from ${3:dbtab}\n{\n  key ${4:field} as ${5:Alias},\n      $0\n}"],
  ['projection', 'define root view entity ${1:ZC_Name}\n  provider contract transactional_query\n  as projection on ${2:ZR_Name}\n{\n  key ${3:Key},\n      $0\n}'],
  ['association', 'association [${1:0..1}] to ${2:ZI_Target} as _${3:Target}\n  on $projection.${4:Key} = _${3:Target}.${5:Key}'],
  ['composition', 'composition [${1:0..*}] of ${2:ZI_Child} as _${3:Child}'],
  ['case … end', 'case ${1:field}\n  when ${2:\'A\'} then ${3:\'Active\'}\n  else ${4:\'\'}\nend as ${5:Alias}'],
  ['cast( )', 'cast( ${1:field} as ${2:abap.char( 10 )} )'],
  ['concat( )', 'concat( ${1:a}, ${2:b} )'],
  ['inner join', 'inner join ${1:dbtab} as ${2:b} on ${3:a.key} = ${2:b}.${4:key}'],
  ['left outer join', 'left outer join ${1:dbtab} as ${2:b} on ${3:a.key} = ${2:b}.${4:key}'],
]);
const CDS_ANNOS = snips([
  ['@AccessControl.authorizationCheck', '@AccessControl.authorizationCheck: #${1:NOT_REQUIRED}'],
  ['@EndUserText.label', "@EndUserText.label: '${1}'"],
  ['@Metadata.allowExtensions', '@Metadata.allowExtensions: true'],
  ['@AbapCatalog.sqlViewName', "@AbapCatalog.sqlViewName: '${1:ZV_NAME}'"],
  ['@VDM.viewType', '@VDM.viewType: #${1:BASIC}'],
  ['@ObjectModel.text.element', "@ObjectModel.text.element: ['${1:Text}']"],
  ['@Semantics.amount.currencyCode', "@Semantics.amount.currencyCode: '${1:Currency}'"],
  ['@Semantics.quantity.unitOfMeasure', "@Semantics.quantity.unitOfMeasure: '${1:Unit}'"],
  ['@Semantics.text', '@Semantics.text: true'],
  ['@UI.headerInfo', "@UI.headerInfo: { typeName: '${1:Item}', typeNamePlural: '${2:Items}', title: { value: '${3:Field}' } }"],
  ['@UI.lineItem', '@UI.lineItem: [{ position: ${1:10} }]'],
  ['@UI.identification', '@UI.identification: [{ position: ${1:10} }]'],
  ['@UI.selectionField', '@UI.selectionField: [{ position: ${1:10} }]'],
  ['@UI.facet', "@UI.facet: [{ id: '${1:General}', type: #IDENTIFICATION_REFERENCE, label: '${2:일반}', position: 10 }]"],
  ['@UI.hidden', '@UI.hidden: true'],
  ['@Search.searchable', '@Search.searchable: true'],
  ['@Search.defaultSearchElement', '@Search.defaultSearchElement: true'],
  ['@Consumption.valueHelpDefinition', "@Consumption.valueHelpDefinition: [{ entity: { name: '${1:ZI_Value}', element: '${2:Key}' } }]"],
]);

/* ───────── SQLScript (AMDP) ───────── */
const SQL_SNIPS = snips([
  ['method … by database procedure', 'method ${1:get_data} by database procedure\n  for hdb\n  language sqlscript\n  options read-only\n  using ${2:dbtab}.\n\n  ${3:et_result} = select ${4:field1, field2}\n                from ${2:dbtab}\n                where ${5:condition};\nendmethod.'],
  ['select … from', 'select ${1:field1, field2}\n  from ${2:dbtab}\n  where ${3:condition};'],
  ['declare', 'declare ${1:lv_name} ${2:nvarchar(10)};'],
  ['if … end if', 'if ${1:condition} then\n  $0\nend if;'],
  ['for … in', 'for ${1:ls_row} as ${2:cur} do\n  $0\nend for;'],
  ['inner join', 'inner join ${1:dbtab} as ${2:b} on ${3:a.key} = ${2:b}.${4:key}'],
]);

/* ───────── JavaScript (UI5) ───────── */
const JS_SNIPS = snips([
  ['sap.ui.define (Controller)', 'sap.ui.define([\n  "sap/ui/core/mvc/Controller",\n  "sap/m/MessageToast"\n], function (Controller, MessageToast) {\n  "use strict";\n\n  return Controller.extend("${1:my.app}.controller.${2:Main}", {\n    onInit: function () {\n      $0\n    }\n  });\n});', 'UI5 컨트롤러'],
  ['sap.ui.define', 'sap.ui.define([\n  "${1:sap/ui/base/Object}"\n], function (${2:Base}) {\n  "use strict";\n  $0\n});'],
  ['onInit', 'onInit: function () {\n  $0\n},'],
  ['handler: function (oEvent)', '${1:onPress}: function (oEvent) {\n  $0\n},', '이벤트 핸들러'],
  ['function', 'function ${1:name}(${2}) {\n  $0\n}'],
  ['arrow function', '(${1}) => {\n  $0\n}'],
  ['if', 'if (${1:condition}) {\n  $0\n}'],
  ['if … else', 'if (${1:condition}) {\n  $0\n} else {\n\n}'],
  ['for', 'for (let ${1:i} = 0; ${1:i} < ${2:array}.length; ${1:i}++) {\n  $0\n}'],
  ['for … of', 'for (const ${1:item} of ${2:array}) {\n  $0\n}'],
  ['forEach', '${1:array}.forEach(function (${2:item}) {\n  $0\n});'],
  ['try … catch', 'try {\n  $0\n} catch (${1:e}) {\n  console.error(${1:e});\n}'],
  ['switch', 'switch (${1:value}) {\n  case ${2:1}:\n    $0\n    break;\n  default:\n    break;\n}'],
  ['console.log', 'console.log(${1});'],
  ['const', 'const ${1:name} = ${2:value};'],
  ['let', 'let ${1:name} = ${2:value};'],
  ['this.byId', 'this.byId("${1:id}")'],
  ['this.getView().getModel', 'this.getView().getModel(${1})'],
  ['this.getOwnerComponent().getRouter', 'this.getOwnerComponent().getRouter()'],
  ['oRouter.navTo', 'this.getOwnerComponent().getRouter().navTo("${1:route}", { ${2} });'],
  ['new JSONModel', 'new JSONModel(${1:{}})'],
  ['MessageToast.show', 'MessageToast.show("${1:text}");'],
  ['MessageBox.confirm', 'MessageBox.confirm("${1:계속할까요?}", {\n  onClose: function (sAction) {\n    if (sAction === MessageBox.Action.OK) {\n      $0\n    }\n  }\n});'],
  ['new Filter', 'new Filter("${1:Field}", FilterOperator.${2:Contains}, ${3:sQuery})'],
  ['oModel.read (OData V2)', 'oModel.read("/${1:EntitySet}", {\n  filters: [${2}],\n  success: function (oData) {\n    $0\n  },\n  error: function (oError) {\n    MessageToast.show("불러오지 못했어요");\n  }\n});'],
  ['fetch', 'fetch("${1:url}")\n  .then((res) => res.json())\n  .then((data) => {\n    $0\n  });'],
  ['addEventListener', '${1:el}.addEventListener("${2:click}", (e) => {\n  $0\n});'],
  ['document.querySelector', 'document.querySelector("${1:selector}")'],
]);
const JS_MEMBERS = plain('fn', [
  'getView', 'byId', 'getModel', 'setModel', 'getProperty', 'setProperty', 'getData', 'setData', 'refresh', 'getOwnerComponent',
  'getRouter', 'navTo', 'getRoute', 'attachPatternMatched', 'getParameter', 'getParameters', 'getSource', 'getBindingContext',
  'getObject', 'getPath', 'bindElement', 'getBinding', 'filter', 'getResourceBundle', 'getText', 'getValue', 'setValue',
  'getSelectedKey', 'setSelectedKey', 'getSelectedItem', 'getSelectedItems', 'setVisible', 'setEnabled', 'setBusy', 'open', 'close',
  'addStyleClass', 'removeStyleClass', 'destroy', 'read', 'create', 'update', 'remove', 'submitChanges', 'extend', 'show',
  'push', 'pop', 'map', 'forEach', 'find', 'findIndex', 'includes', 'indexOf', 'join', 'slice', 'splice', 'sort', 'reduce', 'some', 'every',
  'length', 'trim', 'split', 'replace', 'toUpperCase', 'toLowerCase', 'startsWith', 'endsWith', 'toFixed', 'then', 'catch',
  'attachInit', 'placeAt', 'addContent', 'addItem', 'addPage', 'getCore', 'byId',
  'log', 'error', 'warn', 'stringify', 'parse', 'keys', 'values', 'entries', 'assign', 'querySelector', 'addEventListener',
]);

/** sap.m.Button 처럼 전체 이름으로 쓸 때 점 뒤에 나올 것들 (기초 수업 방식) */
const nsItems = (mods: string, classes: string, fns = ''): Item[] => [
  ...plain('mod', mods.split(' ').filter(Boolean), '네임스페이스'),
  ...plain('cls', classes.split(' ').filter(Boolean)),
  ...plain('fn', fns.split(' ').filter(Boolean)),
];
const UI5_NS: Record<string, Item[]> = {
  sap: nsItems('ui m f uxap tnt ushell', ''),
  'sap.ui': nsItems('core model layout table unified base', 'Device', 'define require getCore controller xmlview jsonview view'),
  'sap.ui.core': nsItems('mvc routing format', 'UIComponent Control Element Fragment Icon Item HTML BusyIndicator Core'),
  'sap.ui.core.mvc': nsItems('', 'Controller XMLView View JSONView'),
  'sap.ui.core.routing': nsItems('', 'History Router'),
  'sap.ui.core.format': nsItems('', 'DateFormat NumberFormat'),
  'sap.ui.model': nsItems('json odata resource', 'Filter FilterOperator Sorter BindingMode'),
  'sap.ui.model.json': nsItems('', 'JSONModel'),
  'sap.ui.model.odata': nsItems('v2 v4', 'ODataModel'),
  'sap.ui.model.odata.v2': nsItems('', 'ODataModel'),
  'sap.ui.model.odata.v4': nsItems('', 'ODataModel'),
  'sap.ui.model.resource': nsItems('', 'ResourceModel'),
  'sap.ui.model.FilterOperator': plain('val', ['EQ', 'NE', 'Contains', 'NotContains', 'StartsWith', 'EndsWith', 'BT', 'GT', 'GE', 'LT', 'LE']),
  'sap.ui.layout': nsItems('form', 'Grid HorizontalLayout VerticalLayout FixFlex'),
  'sap.ui.layout.form': nsItems('', 'SimpleForm Form FormContainer FormElement ResponsiveGridLayout'),
  'sap.ui.table': nsItems('', 'Table Column TreeTable RowAction RowActionItem'),
  'sap.m': nsItems('routing', `App Page Shell SplitApp NavContainer Button Text Title Label Input TextArea CheckBox RadioButton RadioButtonGroup
    Select ComboBox MultiComboBox DatePicker TimePicker Switch Slider StepInput SearchField Link Image Table Column ColumnListItem List
    StandardListItem ObjectListItem CustomListItem VBox HBox FlexBox Panel ScrollContainer Toolbar OverflowToolbar ToolbarSpacer Bar
    Dialog Popover BusyDialog MessageToast MessageBox MessageStrip IconTabBar IconTabFilter ObjectHeader ObjectIdentifier ObjectNumber
    ObjectStatus ObjectAttribute Carousel Wizard WizardStep GenericTile TileContent NumericContent Avatar`),
  'sap.m.MessageToast': plain('fn', ['show']),
  'sap.m.MessageBox': nsItems('', '', 'show alert confirm error information success warning'),
  'sap.f': nsItems('', 'DynamicPage DynamicPageTitle DynamicPageHeader FlexibleColumnLayout Card ShellBar Avatar GridList'),
};

/* ───────── UI5 XML / HTML ───────── */
type Tag = [name: string, body: string];
const tags = (list: Tag[], detail?: string): Item[] => list.map(([label, insert]) => ({ label, insert, kind: 'tag', detail }));
const UI5_TAGS = tags([
  ['mvc:View', 'mvc:View\n  controllerName="${1:my.app}.controller.${2:Main}"\n  xmlns:mvc="sap.ui.core.mvc"\n  xmlns="sap.m">\n  $0\n</mvc:View>'],
  ['core:FragmentDefinition', 'core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core">\n  $0\n</core:FragmentDefinition>'],
  ['App', 'App id="${1:app}">\n  $0\n</App>'],
  ['Page', 'Page id="${1:page}" title="${2:제목}">\n  <content>\n    $0\n  </content>\n</Page>'],
  ['content', 'content>\n  $0\n</content>'],
  ['items', 'items>\n  $0\n</items>'],
  ['columns', 'columns>\n  $0\n</columns>'],
  ['cells', 'cells>\n  $0\n</cells>'],
  ['headerContent', 'headerContent>\n  $0\n</headerContent>'],
  ['VBox', 'VBox class="sapUiSmallMargin">\n  $0\n</VBox>'],
  ['HBox', 'HBox alignItems="Center">\n  $0\n</HBox>'],
  ['Panel', 'Panel headerText="${1:제목}">\n  $0\n</Panel>'],
  ['Button', 'Button text="${1:버튼}" press=".${2:onPress}" />'],
  ['Text', 'Text text="${1:{/text}}" />'],
  ['Title', 'Title text="${1:제목}" />'],
  ['Label', 'Label text="${1:이름}" labelFor="${2:input}" />'],
  ['Input', 'Input id="${1:input}" value="${2:{/value}}" placeholder="${3}" />'],
  ['SearchField', 'SearchField search=".${1:onSearch}" width="${2:100%}" />'],
  ['CheckBox', 'CheckBox text="${1}" selected="${2:{/checked}}" />'],
  ['DatePicker', 'DatePicker value="${1:{/date}}" valueFormat="yyyy-MM-dd" />'],
  ['Select', 'Select selectedKey="${1:{/key}}" items="${2:{/items}}">\n  <core:Item key="{key}" text="{text}" />\n</Select>'],
  ['core:Item', 'core:Item key="${1:{key}}" text="${2:{text}}" />'],
  ['Table', 'Table id="${1:table}" items="${2:{/items}}">\n  <columns>\n    <Column><Text text="${3:이름}" /></Column>\n  </columns>\n  <items>\n    <ColumnListItem>\n      <cells>\n        <Text text="{${4:name}}" />\n      </cells>\n    </ColumnListItem>\n  </items>\n</Table>'],
  ['Column', 'Column>\n  <Text text="${1:이름}" />\n</Column>'],
  ['ColumnListItem', 'ColumnListItem type="Navigation" press=".${1:onItemPress}">\n  <cells>\n    $0\n  </cells>\n</ColumnListItem>'],
  ['List', 'List items="${1:{/items}}">\n  <StandardListItem title="{${2:name}}" description="{${3:desc}}" />\n</List>'],
  ['StandardListItem', 'StandardListItem title="${1:{name}}" description="${2}" />'],
  ['Toolbar', 'Toolbar>\n  $0\n</Toolbar>'],
  ['OverflowToolbar', 'OverflowToolbar>\n  <ToolbarSpacer />\n  $0\n</OverflowToolbar>'],
  ['ToolbarSpacer', 'ToolbarSpacer />'],
  ['Dialog', 'Dialog id="${1:dialog}" title="${2:제목}">\n  $0\n  <beginButton>\n    <Button text="확인" press=".${3:onConfirm}" />\n  </beginButton>\n</Dialog>'],
  ['IconTabBar', 'IconTabBar>\n  <items>\n    <IconTabFilter text="${1:탭}">\n      $0\n    </IconTabFilter>\n  </items>\n</IconTabBar>'],
  ['MessageStrip', 'MessageStrip text="${1}" type="${2:Information}" showIcon="true" />'],
  ['ObjectIdentifier', 'ObjectIdentifier title="${1:{name}}" text="${2}" />'],
  ['ObjectNumber', 'ObjectNumber number="${1:{price}}" unit="${2:{currency}}" />'],
  ['f:SimpleForm', 'f:SimpleForm editable="true" layout="ResponsiveGridLayout">\n  <f:content>\n    $0\n  </f:content>\n</f:SimpleForm>'],
], 'UI5');
const UI5_ATTRS = plain('attr', ['id', 'text', 'press', 'value', 'items', 'title', 'visible', 'enabled', 'editable', 'width', 'class', 'type', 'icon', 'placeholder',
  'change', 'liveChange', 'select', 'selectedKey', 'headerText', 'description', 'mode', 'growing', 'busy', 'controllerName', 'xmlns', 'xmlns:mvc', 'xmlns:core', 'xmlns:f', 'binding', 'key', 'state'])
  .map((it) => ({ ...it, insert: `${it.label}="\${1}"` }));
const HTML_TAGS = tags([
  ['html (기본 문서)', 'html lang="ko">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${1:제목}</title>\n</head>\n<body>\n  $0\n</body>\n</html>'],
  ['div', 'div class="${1}">$0</div>'], ['span', 'span>$0</span>'], ['p', 'p>$0</p>'], ['a', 'a href="${1:#}">$0</a>'],
  ['img', 'img src="${1}" alt="${2}">'], ['button', 'button type="${1:button}">$0</button>'], ['input', 'input type="${1:text}" name="${2}">'],
  ['label', 'label for="${1}">$0</label>'], ['form', 'form action="${1}">\n  $0\n</form>'], ['ul', 'ul>\n  <li>$0</li>\n</ul>'], ['li', 'li>$0</li>'],
  ['h1', 'h1>$0</h1>'], ['h2', 'h2>$0</h2>'], ['h3', 'h3>$0</h3>'], ['section', 'section>\n  $0\n</section>'], ['header', 'header>\n  $0\n</header>'],
  ['footer', 'footer>\n  $0\n</footer>'], ['main', 'main>\n  $0\n</main>'], ['nav', 'nav>\n  $0\n</nav>'],
  ['table', 'table>\n  <tr>\n    <td>$0</td>\n  </tr>\n</table>'], ['tr', 'tr>$0</tr>'], ['td', 'td>$0</td>'], ['th', 'th>$0</th>'],
  ['select', 'select name="${1}">\n  <option value="${2}">$0</option>\n</select>'], ['option', 'option value="${1}">$0</option>'], ['textarea', 'textarea name="${1}">$0</textarea>'],
  ['script', 'script src="${1}"></script>'], ['link', 'link rel="stylesheet" href="${1:style.css}">'], ['meta', 'meta name="${1}" content="${2}">'], ['br', 'br>'],
]);
const HTML_ATTRS = plain('attr', ['class', 'id', 'href', 'src', 'alt', 'type', 'name', 'value', 'style', 'for', 'placeholder', 'onclick', 'disabled', 'required', 'checked', 'target', 'rel', 'title', 'lang'])
  .map((it) => ({ ...it, insert: ['disabled', 'required', 'checked'].includes(it.label) ? it.label : `${it.label}="\${1}"` }));

/* ───────── CSS ───────── */
const CSS_VALUES: Record<string, string[]> = {
  display: ['flex', 'grid', 'block', 'inline-block', 'inline-flex', 'none'],
  position: ['relative', 'absolute', 'fixed', 'sticky', 'static'],
  'justify-content': ['center', 'space-between', 'space-around', 'flex-start', 'flex-end'],
  'align-items': ['center', 'flex-start', 'flex-end', 'stretch', 'baseline'],
  'flex-direction': ['row', 'column', 'row-reverse', 'column-reverse'],
  'flex-wrap': ['wrap', 'nowrap'],
  'text-align': ['left', 'center', 'right', 'justify'],
  'font-weight': ['400', '500', '600', '700', 'bold', 'normal'],
  cursor: ['pointer', 'default', 'not-allowed'],
  overflow: ['hidden', 'auto', 'scroll', 'visible'],
  'box-sizing': ['border-box', 'content-box'],
  'white-space': ['nowrap', 'pre', 'pre-wrap', 'normal'],
  'text-decoration': ['none', 'underline'],
  visibility: ['visible', 'hidden'],
};
const CSS_PROPS = ['display', 'position', 'top', 'right', 'bottom', 'left', 'width', 'height', 'max-width', 'min-height', 'margin', 'margin-top', 'margin-bottom',
  'padding', 'border', 'border-radius', 'background', 'background-color', 'color', 'font-size', 'font-weight', 'font-family', 'line-height', 'text-align',
  'justify-content', 'align-items', 'flex-direction', 'flex-wrap', 'flex', 'gap', 'grid-template-columns', 'overflow', 'box-sizing', 'box-shadow', 'cursor',
  'opacity', 'z-index', 'transition', 'transform', 'white-space', 'text-decoration', 'visibility', 'content'];
const CSS_SNIPS = snips([
  ['@media', '@media (max-width: ${1:600px}) {\n  $0\n}'],
  ['flex center', 'display: flex;\njustify-content: center;\nalign-items: center;'],
]);

const KIND_ORDER: Record<Kind, number> = { tpl: 0, snip: 0, tag: 0, kw: 1, prop: 1, attr: 1, val: 1, fn: 1, cls: 1, mod: 1, word: 2 };

/** 첫 글자가 같고, 친 글자가 순서대로 다 들어 있으면 맞는 걸로 봐요 (VS Code처럼 띄엄띄엄 쳐도 찾기). */
export function fuzzy(label: string, prefix: string): number[] | null {
  const l = label.toLowerCase(), p = prefix.toLowerCase();
  if (!p) return [];
  if (l[0] !== p[0]) return null;
  const at: number[] = [];
  let j = 0;
  for (let i = 0; i < l.length && j < p.length; i++) if (l[i] === p[j]) { at.push(i); j++; }
  return j === p.length ? at : null;
}

function rank(items: Item[], prefix: string): Item[] {
  const p = prefix.toLowerCase();
  const seen = new Set<string>();
  return items
    .map((it) => {
      const l = it.label.toLowerCase();
      if (p && l === p && it.kind !== 'snip' && it.kind !== 'tag' && it.kind !== 'tpl') return null; // 이미 다 친 낱말은 보여 줄 필요가 없어요
      if (l.startsWith(p)) return { it, s: 0 };
      return fuzzy(l, p) ? { it, s: 1 } : null;
    })
    .filter((x): x is { it: Item; s: number } => x !== null)
    .sort((a, b) => a.s - b.s || KIND_ORDER[a.it.kind] - KIND_ORDER[b.it.kind] || a.it.label.length - b.it.label.length || a.it.label.localeCompare(b.it.label))
    .map((x) => x.it)
    .filter((it) => { const k = it.label.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 100);
}

/** 코드에 이미 나온 이름 (변수, 메서드 등) */
function docWords(text: string, re: RegExp, skip: string, exclude: Set<string>): Item[] {
  const out = new Set<string>();
  for (const m of text.matchAll(re)) {
    const w = m[0];
    if (w.length < 3 || w === skip || exclude.has(w.toLowerCase())) continue;
    out.add(w);
    if (out.size > 400) break;
  }
  return plain('word', [...out], '코드에 있는 이름');
}

/** 주석이나 문자열 안이면 자동완성을 띄우지 않아요. */
export function inCommentOrString(line: string, lang: string): boolean {
  if (lang === 'ABAP') {
    if (/^\*/.test(line)) return true;
    const s = line.replace(/'(?:[^']|'')*'|`[^`]*`|\|[^|]*\|/g, '');
    return /["'`|]/.test(s);
  }
  if (lang === 'XML' || lang === 'HTML') return /<!--(?!.*-->)/.test(line);
  const s = line.replace(/\\./g, '').replace(/"[^"]*"|'[^']*'|`[^`]*`/g, '');
  if (/["'`]/.test(s)) return true;
  if (lang === 'CDS' || lang === 'SQLScript') return /--|\/\//.test(s);
  if (lang === 'CSS') return /\/\*(?!.*\*\/)/.test(s);
  return /\/\//.test(s);
}

/** 아직 닫지 않은 태그 (안쪽부터) */
export function openTags(before: string): string[] {
  const stack: string[] = [];
  const re = /<!--[\s\S]*?-->|<(\/?)([\w:.-]+)(?:[^<>"']|"[^"]*"|'[^']*')*?(\/?)>/g;
  for (const m of before.matchAll(re)) {
    if (!m[2]) continue;
    if (m[1]) { const i = stack.lastIndexOf(m[2]); if (i >= 0) stack.length = i; }
    else if (!m[3] && !VOID.has(m[2].toLowerCase())) stack.push(m[2]);
  }
  return stack.reverse();
}
const VOID = new Set(['img', 'input', 'br', 'meta', 'link', 'hr', 'source', 'area', 'col', 'base', 'wbr']);

/**
 * 커서 자리에서 보여 줄 자동완성 목록. 보여 줄 게 없으면 null.
 * force는 Ctrl+Space처럼 직접 열 때예요 (아무것도 안 쳤어도 목록을 보여 줘요).
 */
export function suggest(text: string, pos: number, lang: string, force = false, file = ''): Suggestion | null {
  const before = text.slice(0, pos);
  const line = before.slice(before.lastIndexOf('\n') + 1);
  if (/[\w$-]/.test(text[pos] ?? '') && !force) return null; // 낱말 가운데에서는 띄우지 않아요
  if (inCommentOrString(line, lang)) return null;
  // 파일 맨 앞이면 프로젝트를 만들 때 생기는 기본 코드도 같이 보여 줘요.
  const atStart = !text.slice(0, pos - (/<?!?[\w$@:-]*$/.exec(line)?.[0].length ?? 0)).trim() && !text.slice(pos).trim();
  const tpls = (dropLt = false): Item[] => (atStart ? templatesFor(lang) : []).map((t) => {
    const body = fillTemplate(t, file).body;
    if (!dropLt) return { label: t.label, insert: body, kind: 'tpl' as const, detail: t.from };
    // <mvc 처럼 태그부터 쳤을 때는 태그 이름으로 찾을 수 있게 해요.
    const tag = /^<([!\w:.-]+)/.exec(body)?.[1] ?? '';
    return { label: `${tag} · ${t.label}`, insert: body.startsWith('<') ? body.slice(1) : body, kind: 'tpl' as const, detail: t.from };
  });
  const out = (prefix: string, items: Item[], allowEmpty = false): Suggestion | null => {
    if (!prefix && !force && !allowEmpty) return null;
    const ranked = rank([...tpls(), ...items], prefix);
    return ranked.length ? { from: pos - prefix.length, prefix, items: ranked } : null;
  };

  if (lang === 'XML' || lang === 'HTML') {
    const ui5 = lang === 'XML';
    let m = /<\/([\w:.-]*)$/.exec(line);
    if (m) {
      const open = openTags(before.slice(0, pos - m[0].length));
      return out(m[1], open.map((t, i) => ({ label: t, insert: `${t}>`, kind: 'tag' as const, detail: i === 0 ? '닫는 태그' : undefined })), true);
    }
    m = /<(!?[\w:.-]*)$/.exec(line);
    if (m) {
      const r = rank([...tpls(true), ...(ui5 ? UI5_TAGS : HTML_TAGS)], m[1]);
      return r.length ? { from: pos - m[1].length, prefix: m[1], items: r } : null;
    }
    if (atStart) { const w = /[\w.]*$/.exec(line)![0]; return out(w, []); }
    const lt = before.lastIndexOf('<'), gt = before.lastIndexOf('>');
    if (lt > gt) {
      const tagText = before.slice(lt);
      if ((tagText.match(/"/g) ?? []).length % 2 === 1) return null; // 속성 값 안
      m = /\s([\w:.-]*)$/.exec(tagText);
      if (m) return out(m[1], ui5 ? UI5_ATTRS : HTML_ATTRS);
    }
    return null;
  }

  if (lang === 'CSS') {
    const depth = (before.match(/\{/g) ?? []).length - (before.match(/\}/g) ?? []).length;
    if (depth > 0) {
      const v = /([\w-]+)\s*:\s*(?:[^;{}]*\s)?([\w-]*)$/.exec(line);
      if (v) return out(v[2], plain('val', [...(CSS_VALUES[v[1]] ?? []), 'auto', 'none', 'inherit', '0', '100%', 'transparent']));
      const p = /(?:^|[\s;{])([\w-]*)$/.exec(line);
      if (p) return out(p[1], [...plain('prop', CSS_PROPS).map((it) => ({ ...it, insert: `${it.label}: \${1};` })), ...CSS_SNIPS.slice(1)]);
      return null;
    }
    const m = /(@?[\w-]*)$/.exec(line)!;
    return out(m[1], [...CSS_SNIPS.slice(0, 1), ...HTML_TAGS.filter((t) => !t.label.includes(' ')).map((t) => ({ ...t, insert: t.label })), ...docWords(text, /[.#][\w-]+/g, m[1], new Set())]);
  }

  if (lang === 'JSON') {
    const m = /([\w.$-]*)$/.exec(line)!;
    return out(m[1], [...plain('kw', ['true', 'false', 'null']), ...docWords(text, /[A-Za-z_$][\w.$-]*/g, m[1], new Set())]);
  }

  const kws = keywordsFor(lang === 'TypeScript' ? 'JavaScript' : lang);
  const kwSet = new Set(kws);

  if (lang === 'CDS') {
    const a = /@[\w.]*$/.exec(line);
    if (a) return out(a[0], CDS_ANNOS);
    const m = /[A-Za-z_][\w]*$/.exec(line)?.[0] ?? '';
    return out(m, [...CDS_SNIPS, ...plain('kw', kws), ...docWords(text, /[A-Za-z_]\w*/g, m, kwSet)]);
  }
  if (lang === 'ABAP') {
    const m = /[A-Za-z_][\w-]*$/.exec(line)?.[0] ?? '';
    if (/->|=>|~/.test(line.slice(-2)) && !m) return null;
    return out(m, [...ABAP_SNIPS, ...plain('kw', kws), ...ABAP_EXTRA, ...docWords(text, /[A-Za-z_][\w-]*/g, m, kwSet)]);
  }
  if (lang === 'SQLScript' || lang === 'SQL') {
    const m = /[A-Za-z_][\w]*$/.exec(line)?.[0] ?? '';
    return out(m, [...SQL_SNIPS, ...plain('kw', kws), ...docWords(text, /[A-Za-z_]\w*/g, m, kwSet)]);
  }

  // JavaScript (UI5) 그리고 예전 글의 비슷한 언어들
  const chain = /(?:^|[^\w$.])((?:[A-Za-z_$][\w$]*\.)+)([\w$]*)$/.exec(line);
  const ns = chain && UI5_NS[chain[1].slice(0, -1)];
  if (chain && ns) return out(chain[2], ns, true);
  const dot = /([\w$)\]])\.([\w$]*)$/.exec(line);
  if (dot) {
    const used = docWords(text, /(?<=\.)[A-Za-z_$][\w$]*/g, dot[2], new Set()).map((it) => ({ ...it, kind: 'fn' as const, detail: undefined }));
    return out(dot[2], [...JS_MEMBERS, ...used], true);
  }
  const m = /[A-Za-z_$][\w$]*$/.exec(line)?.[0] ?? '';
  return out(m, [...JS_SNIPS, ...plain('mod', ['sap'], 'UI5 네임스페이스'), ...plain('kw', kws), ...docWords(text, /[A-Za-z_$][\w$]*/g, m, kwSet)]);
}

/** ABAP·SQL은 친 글자가 대문자면 키워드도 대문자로 넣어요. */
export function caseFor(lang: string, prefix: string, item: Item): (s: string) => string {
  if ((lang !== 'ABAP' && lang !== 'SQLScript' && lang !== 'SQL') || (item.kind !== 'kw' && item.kind !== 'snip')) return (s) => s;
  return /[A-Z]/.test(prefix) && prefix === prefix.toUpperCase() ? (s) => s.toUpperCase() : (s) => s;
}

/**
 * 스니펫을 실제 글로 펼쳐요. 둘째 줄부터는 지금 줄의 들여쓰기를 붙이고,
 * 첫 번째 자리표시(${1:…})를 골라 둔 상태, 없으면 $0이나 끝에 커서를 둬요.
 */
export function expand(body: string, indent: string, cased: (s: string) => string = (s) => s): { text: string; start: number; end: number } {
  const src = body.replace(/\n/g, `\n${indent}`);
  const re = /\$\{(\d+)(?::([^}]*))?\}|\$(\d+)/g;
  let text = '', last = 0, best = Infinity, sel: [number, number] | null = null, zero = -1;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    text += cased(src.slice(last, m.index));
    const n = Number(m[1] ?? m[3]);
    const ph = m[2] ?? '';
    if (n === 0) zero = text.length;
    else if (n < best) { best = n; sel = [text.length, text.length + ph.length]; }
    text += ph;
    last = re.lastIndex;
  }
  text += cased(src.slice(last));
  if (sel) return { text, start: sel[0], end: sel[1] };
  const at = zero >= 0 ? zero : text.length;
  return { text, start: at, end: at };
}

/* ───────── 편집 도우미 (괄호 닫기, 들여쓰기) ───────── */

export const PAIRS: Record<string, string> = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };

/** 여는 괄호·따옴표를 쳤을 때 닫는 것도 같이 넣을지 */
export function shouldPair(ch: string, text: string, pos: number, lang: string): boolean {
  if (!(ch in PAIRS)) return false;
  if (lang === 'ABAP' && ch === '"') return false; // ABAP에서 "는 주석이에요
  if (lang === 'ABAP' && ch === '{') return false;
  const next = text[pos] ?? '';
  if (next && !/[\s)\]};,.>]/.test(next)) return false;
  const prev = text[pos - 1] ?? '';
  if (PAIRS[ch] === ch && /[\w$]/.test(prev)) return false; // don't 같은 경우
  const line = text.slice(text.lastIndexOf('\n', pos - 1) + 1, pos);
  if (PAIRS[ch] !== ch && inCommentOrString(line, lang)) return false;
  return true;
}

const ABAP_OPEN = /^\s*(if|elseif|else|loop|do|while|case|when|method|try|catch|cleanup|form|function|module|at|(?:public|protected|private)\s+section|class\s+\S+\s+(?:definition|implementation))\b.*\.\s*$/i;

/** 엔터를 쳤을 때 넣을 글과 커서 위치 (VS Code처럼 들여쓰기 유지 + 블록이 열리면 한 칸 더) */
export function newline(text: string, pos: number, lang: string): { text: string; caret: number } {
  const ls = text.lastIndexOf('\n', pos - 1) + 1;
  const line = text.slice(ls, pos);
  const indent = /^[ \t]*/.exec(line)![0];
  const prev = line.trimEnd().slice(-1);
  const next = text[pos] ?? '';
  let more = false;
  if ('([{'.includes(prev) && prev) more = true;
  else if (lang === 'ABAP' && ABAP_OPEN.test(line)) more = true;
  else if ((lang === 'XML' || lang === 'HTML') && /<([\w:.-]+)(?:[^<>"']|"[^"]*"|'[^']*')*>\s*$/.test(line) && !/\/>\s*$/.test(line)) {
    const tag = /<([\w:.-]+)(?:[^<>"']|"[^"]*"|'[^']*')*>\s*$/.exec(line)![1];
    more = !VOID.has(tag.toLowerCase()) && !new RegExp(`</${tag.replace(/[.]/g, '\\.')}>`).test(line);
  }
  const inner = indent + (more ? '  ' : '');
  // {|} 나 <a>|</a> 사이에서 엔터를 치면 닫는 쪽을 다음 줄로 내려요.
  const between = more && ((prev === '{' && next === '}') || (prev === '(' && next === ')') || (prev === '[' && next === ']') || (prev === '>' && text.startsWith('</', pos)));
  const ins = `\n${inner}` + (between ? `\n${indent}` : '');
  return { text: ins, caret: 1 + inner.length };
}
