/**
 * 마우스를 올리면 보여 줄 설명 (VS Code hover처럼).
 * sig는 코드 모양으로 보여 줄 한 줄, text는 설명, link는 공식 문서예요.
 */
export interface Doc { sig?: string; text: string; link?: string; title?: string }

const UI5_API = (name: string) => `https://ui5.sap.com/1.120.2/#/api/${name}`;
const MDN_CSS = (p: string) => `https://developer.mozilla.org/ko/docs/Web/CSS/${p}`;
const MDN_HTML = (t: string) => `https://developer.mozilla.org/ko/docs/Web/HTML/Element/${t}`;

const d = (sig: string, text: string, link?: string): Doc => ({ sig: sig || undefined, text, link });

/* ───────── ABAP (소문자로 찾아요) ───────── */
const ABAP: Record<string, Doc> = {
  report: d('REPORT zr_name.', '실행 가능한 프로그램(리포트)의 시작을 선언해요. 프로그램 맨 처음에 한 번 써요.'),
  data: d('DATA lv_name TYPE type.', '변수를 선언해요. 7.40부터는 DATA(lv_x) = … 처럼 쓰는 자리에서 바로 선언(인라인 선언)할 수도 있어요.'),
  types: d('TYPES ty_name TYPE type.', '새 타입을 정의해요. BEGIN OF … END OF로 구조 타입, TABLE OF로 테이블 타입을 만들어요.'),
  constants: d('CONSTANTS lc_name TYPE type VALUE value.', '바꿀 수 없는 상수를 선언해요. VALUE로 값을 꼭 줘야 해요.'),
  parameters: d('PARAMETERS p_name TYPE type.', '선택 화면에 입력칸 하나를 만들어요. 이름은 8자까지예요.'),
  'select-options': d('SELECT-OPTIONS s_name FOR dbtab-field.', '선택 화면에 범위 입력칸(From~To, 여러 값)을 만들어요. WHERE field IN s_name 으로 써요.'),
  'field-symbols': d('FIELD-SYMBOLS <fs> TYPE type.', '필드 심볼(다른 데이터를 가리키는 이름)을 선언해요. LOOP … ASSIGNING <fs>로 복사 없이 바로 고칠 때 써요.'),
  'field-symbol': d('ASSIGNING FIELD-SYMBOL(<fs>)', '필드 심볼을 그 자리에서 바로 선언해요 (인라인 선언).'),
  loop: d('LOOP AT itab INTO wa. … ENDLOOP.', '인터널 테이블을 한 줄씩 돌아요. INTO는 복사, ASSIGNING은 원본을 바로 가리켜요. 지금 몇 번째 줄인지는 sy-tabix에 있어요.'),
  read: d('READ TABLE itab INTO wa WITH KEY field = value.', '인터널 테이블에서 한 줄을 찾아요. 찾으면 sy-subrc = 0이에요. 7.40부터는 itab[ field = value ]로도 읽어요.'),
  append: d('APPEND wa TO itab.', '인터널 테이블 끝에 한 줄을 넣어요.'),
  insert: d('INSERT wa INTO TABLE itab. / INSERT dbtab FROM wa.', '인터널 테이블에 줄을 넣거나, DB 테이블에 새 레코드를 넣어요.'),
  modify: d('MODIFY dbtab FROM wa. / MODIFY itab FROM wa.', '있으면 바꾸고 없으면 넣어요 (DB). 인터널 테이블에서는 해당 줄을 바꿔요.'),
  delete: d('DELETE itab WHERE … / DELETE FROM dbtab WHERE …', '인터널 테이블의 줄이나 DB 레코드를 지워요.'),
  clear: d('CLEAR var.', '변수를 초기값으로 되돌려요. 인터널 테이블이면 모든 줄을 지워요.'),
  free: d('FREE itab.', 'CLEAR처럼 비우고, 잡고 있던 메모리도 돌려줘요.'),
  sort: d('SORT itab BY field [ASCENDING|DESCENDING].', '인터널 테이블을 정렬해요. BINARY SEARCH 전에는 꼭 같은 키로 정렬해야 해요.'),
  select: d('SELECT fields FROM dbtab WHERE … INTO TABLE @itab.', 'DB에서 데이터를 읽어요 (Open SQL). 필요한 필드만 고르고, 루프 안에서 SELECT하지 않는 게 좋아요. 읽었으면 sy-subrc = 0, 줄 수는 sy-dbcnt예요.'),
  single: d('SELECT SINGLE … INTO @wa.', '조건에 맞는 한 줄만 읽어요. 키를 다 주는 게 좋아요.'),
  into: d('INTO @wa / INTO TABLE @itab', 'SELECT 결과를 담을 곳이에요. 새 문법에서는 변수 앞에 @를 붙여요.'),
  where: d('WHERE condition', '조건에 맞는 것만 골라요.'),
  endselect: d('SELECT … ENDSELECT.', 'SELECT 루프를 닫아요. 한 줄씩 DB를 오가서 느리니, 보통 INTO TABLE로 한 번에 읽어요.'),
  if: d('IF condition. … ELSEIF … ELSE. … ENDIF.', '조건이 참일 때만 실행해요.'),
  case: d('CASE var. WHEN a. … WHEN OTHERS. … ENDCASE.', '값에 따라 갈래를 나눠요. WHEN OTHERS는 나머지 전부예요.'),
  do: d('DO n TIMES. … ENDDO.', '정해진 횟수(또는 EXIT할 때까지) 반복해요. 지금 몇 번째인지는 sy-index에 있어요.'),
  while: d('WHILE condition. … ENDWHILE.', '조건이 참인 동안 반복해요.'),
  exit: d('EXIT.', '루프 안에서는 루프를 끝내고, 밖에서는 지금 처리 블록을 빠져나가요.'),
  continue: d('CONTINUE.', '루프에서 이번 차례를 건너뛰고 다음으로 가요.'),
  check: d('CHECK condition.', '조건이 거짓이면 루프에서는 다음 차례로, 밖에서는 처리 블록을 빠져나가요.'),
  return: d('RETURN.', '지금 메서드·처리 블록을 끝내요.'),
  try: d('TRY. … CATCH cx_class INTO DATA(lx). … ENDTRY.', '예외(오류)가 날 수 있는 부분을 감싸고, CATCH에서 처리해요.'),
  catch: d('CATCH cx_class INTO DATA(lx).', 'TRY 안에서 난 예외를 잡아요. lx->get_text( )로 메시지를 볼 수 있어요.'),
  raise: d('RAISE EXCEPTION TYPE cx_class.', '예외를 일으켜요.'),
  class: d('CLASS zcl_name DEFINITION. … ENDCLASS.', '클래스를 정의(DEFINITION)하고 구현(IMPLEMENTATION)해요. PUBLIC/PROTECTED/PRIVATE SECTION으로 공개 범위를 나눠요.'),
  definition: d('CLASS zcl_name DEFINITION …', '클래스의 모양(속성, 메서드 목록)을 적는 부분이에요.'),
  implementation: d('CLASS zcl_name IMPLEMENTATION. … ENDCLASS.', '클래스 메서드의 실제 코드를 적는 부분이에요.'),
  methods: d('METHODS name IMPORTING iv TYPE t RETURNING VALUE(rv) TYPE t.', '인스턴스 메서드를 선언해요. CLASS-METHODS는 정적 메서드예요.'),
  method: d('METHOD name. … ENDMETHOD.', '메서드의 실제 코드를 적어요.'),
  interfaces: d('INTERFACES zif_name.', '클래스가 인터페이스를 구현한다고 선언해요. 메서드는 zif_name~method 로 구현해요.'),
  interface: d('INTERFACE zif_name PUBLIC. … ENDINTERFACE.', '인터페이스(구현 없이 메서드 목록만 있는 약속)를 정의해요.'),
  if_oo_adt_classrun: d('INTERFACES if_oo_adt_classrun.', 'ADT(Eclipse)에서 F9로 클래스를 바로 실행할 수 있게 해 주는 인터페이스예요. main 메서드의 out->write( )로 콘솔에 출력해요.'),
  'if_oo_adt_classrun~main': d('METHOD if_oo_adt_classrun~main.', 'F9로 실행하면 불리는 메서드예요. out->write( … )로 콘솔에 찍어요.'),
  out: d("out->write( data ).", 'if_oo_adt_classrun~main의 출력 객체예요. 값, 구조, 테이블을 ADT 콘솔에 보여 줘요.'),
  write: d("WRITE: / 'text'.", '리스트 화면에 출력해요. /는 줄바꿈이에요.'),
  message: d("MESSAGE 'text' TYPE 'S'.", "메시지를 띄워요. TYPE은 S(성공) I(정보) W(경고) E(오류) A(중단) X(덤프)예요."),
  concatenate: d('CONCATENATE a b INTO result SEPARATED BY space.', '문자열을 이어 붙여요. 새 문법은 |{ a } { b }| 또는 a && b 예요.'),
  split: d('SPLIT str AT sep INTO a b.', '구분자로 문자열을 나눠요.'),
  condense: d('CONDENSE str [NO-GAPS].', '앞뒤 공백을 지우고 가운데 여러 공백을 하나로 줄여요.'),
  replace: d('REPLACE ALL OCCURRENCES OF a IN str WITH b.', '문자열 일부를 바꿔요.'),
  value: d('VALUE #( ( f = 1 ) ( f = 2 ) )', '구조나 인터널 테이블을 그 자리에서 만들어요. #는 왼쪽 타입을 따라가요.'),
  cond: d('COND #( WHEN a THEN x ELSE y )', '조건에 따라 값을 골라요 (식 안에서 쓰는 IF).'),
  switch: d('SWITCH #( var WHEN a THEN x ELSE y )', '값에 따라 결과를 골라요 (식 안에서 쓰는 CASE).'),
  conv: d('CONV type( value )', '값을 다른 타입으로 바꿔요.'),
  corresponding: d('CORRESPONDING #( source )', '이름이 같은 필드끼리 복사해요.'),
  new: d('NEW zcl_name( ) / NEW #( )', '객체를 만들어요 (CREATE OBJECT의 새 문법).'),
  ref: d('REF #( var )', '변수를 가리키는 참조를 만들어요.'),
  reduce: d('REDUCE i( INIT s = 0 FOR wa IN itab NEXT s = s + wa-n )', '테이블을 돌면서 값 하나로 모아요 (합계 등).'),
  filter: d('FILTER #( itab WHERE f = v )', '조건에 맞는 줄만 남긴 새 테이블을 만들어요. 정렬·해시 키가 있는 테이블이어야 해요.'),
  lines: d('lines( itab )', '인터널 테이블의 줄 수를 돌려줘요.'),
  line_exists: d('line_exists( itab[ f = v ] )', '그 조건의 줄이 있는지 참/거짓으로 알려 줘요.'),
  'sy-subrc': d('sy-subrc', '바로 앞 문장의 결과 코드예요. 0이면 성공, 그 밖의 값은 실패(못 찾음 등)예요. 확인하기 전에 다른 문장을 쓰면 값이 바뀌어요.'),
  'sy-tabix': d('sy-tabix', 'LOOP/READ TABLE에서 지금 줄 번호예요.'),
  'sy-index': d('sy-index', 'DO/WHILE에서 지금 몇 번째 반복인지예요.'),
  'sy-dbcnt': d('sy-dbcnt', 'DB 문장(SELECT, UPDATE 등)이 처리한 줄 수예요.'),
  'sy-datum': d('sy-datum', '오늘 날짜 (YYYYMMDD, 타입 d)예요.'),
  'sy-uzeit': d('sy-uzeit', '지금 시간 (HHMMSS, 타입 t)예요.'),
  'sy-uname': d('sy-uname', '로그인한 사용자 ID예요.'),
  'sy-langu': d('sy-langu', '로그인 언어예요.'),
  abap_true: d("abap_true = 'X'", 'ABAP의 참 값이에요 (abap_bool 타입).'),
  abap_false: d("abap_false = ' '", 'ABAP의 거짓 값이에요.'),
  initial: d('IS INITIAL', '초기값(0, 빈 문자열, 빈 테이블 등)인지 확인해요.'),
  'start-of-selection': d('START-OF-SELECTION.', '선택 화면 입력이 끝난 뒤 실행되는 이벤트예요. 리포트의 메인 코드가 여기 들어가요.'),
  initialization: d('INITIALIZATION.', '선택 화면이 뜨기 전에 실행돼요. 기본값을 넣을 때 써요.'),
  form: d('FORM name. … ENDFORM.', '서브루틴을 정의해요. 옛 방식이라 새 코드에서는 메서드를 쓰는 게 좋아요.'),
  perform: d('PERFORM name.', 'FORM 서브루틴을 불러요.'),
  commit: d('COMMIT WORK.', 'DB 변경을 확정해요.'),
  rollback: d('ROLLBACK WORK.', '확정 전의 DB 변경을 되돌려요.'),
  string: d('TYPE string', '길이 제한이 없는 문자열 타입이에요.'),
  i: d('TYPE i', '4바이트 정수 타입이에요.'),
  p: d('TYPE p LENGTH 8 DECIMALS 2', '소수점이 있는 숫자(packed) 타입이에요. 금액에 많이 써요.'),
  c: d('TYPE c LENGTH 10', '고정 길이 문자 타입이에요.'),
  n: d('TYPE n LENGTH 10', '숫자만 들어가는 고정 길이 문자 타입이에요.'),
  d: d('TYPE d', '날짜 타입 (YYYYMMDD)이에요.'),
  t: d('TYPE t', '시간 타입 (HHMMSS)이에요.'),
  if_amdp_marker_hdb: d('INTERFACES if_amdp_marker_hdb.', '이 클래스에 AMDP(HANA에서 도는 SQLScript) 메서드가 있다고 표시해요.'),
};
const ABAP_ALIAS: Record<string, string> = {
  endloop: 'loop', endif: 'if', elseif: 'if', else: 'if', endcase: 'case', when: 'case', others: 'case', enddo: 'do', endwhile: 'while',
  endtry: 'try', cleanup: 'try', endclass: 'class', endmethod: 'method', endinterface: 'interface', endform: 'form', 'class-methods': 'methods',
  'class-data': 'data', table: 'read', is: 'initial', 'data(': 'data',
};

/* ───────── CDS ───────── */
const CDS: Record<string, Doc> = {
  define: d('define view entity ZI_Name as select from dbtab { … }', 'CDS 뷰(또는 서비스 등)를 정의해요.'),
  view: d('define view entity …', 'DB 테이블을 조합해 보여 주는 가상 테이블이에요.'),
  entity: d('define view entity ZI_Name', 'CDS View Entity예요. 따로 SQL 뷰를 만들지 않는 새 방식이라 @AbapCatalog.sqlViewName이 필요 없어요.'),
  root: d('define root view entity', 'RAP 비즈니스 객체의 맨 위(루트) 엔티티예요.'),
  projection: d('as projection on ZR_Name', '다른 뷰를 가져와 보여 줄 필드만 고르는 뷰예요 (RAP 소비 계층).'),
  provider: d('provider contract transactional_query', '이 프로젝션 뷰를 어떤 용도로 쓰는지 정해요.'),
  transactional_query: d('provider contract transactional_query', '트랜잭션(생성·수정)이 되는 Fiori 앱용 프로젝션이에요.'),
  association: d('association [0..1] to ZI_Target as _Target on $projection.Key = _Target.Key', '필요할 때만 조인되는 연결이에요. 이름은 _로 시작하고, 필드 목록에 _Target을 넣어 공개해요.'),
  composition: d('composition [0..*] of ZI_Child as _Child', '부모-자식 관계(자식은 부모 없이 못 있어요)예요. RAP에서 하위 엔티티를 연결할 때 써요.'),
  key: d('key field', '이 뷰의 키 필드예요. 필드 목록 맨 앞에 와야 해요.'),
  as: d('field as Alias', '필드나 소스에 다른 이름(별칭)을 붙여요.'),
  select: d('as select from dbtab', '어떤 테이블·뷰에서 데이터를 읽을지 정해요.'),
  cast: d('cast( field as abap.char( 10 ) )', '필드 타입을 바꿔요.'),
  case: d("case field when 'A' then 'x' else 'y' end as Alias", '값에 따라 다른 값을 보여 줘요.'),
  $projection: d('$projection.Field', '이 뷰의 필드 목록(별칭 기준)을 가리켜요. association 조건에서 많이 써요.'),
  annotate: d('annotate entity ZC_Name with { … }', '메타데이터 확장(MDE)으로 뷰에 UI 어노테이션을 따로 붙여요.'),
  service: d('define service ZUI_Name { expose ZC_Name; }', '서비스 정의예요. 밖에 공개할 엔티티를 expose로 적어요.'),
  expose: d('expose ZC_Name as Alias;', '서비스에 엔티티를 공개해요.'),
  union: d('… union all select from …', '두 SELECT 결과를 합쳐요. 필드 수와 순서가 같아야 해요.'),
  '@abapcatalog.sqlviewname': d("@AbapCatalog.sqlViewName: 'ZV_NAME'", '옛 방식 CDS 뷰(define view)가 DB에 만들 SQL 뷰 이름이에요 (16자까지). View Entity에서는 쓰지 않아요.'),
  '@abapcatalog.compiler.comparefilter': d('@AbapCatalog.compiler.compareFilter: true', '같은 association 필터를 한 번만 조인하도록 해요.'),
  '@abapcatalog.preservekey': d('@AbapCatalog.preserveKey: true', 'SQL 뷰의 키를 CDS에 적은 key 필드로 맞춰요.'),
  '@abapcatalog.viewenhancementcategory': d('@AbapCatalog.viewEnhancementCategory: [#NONE]', '이 뷰를 다른 곳에서 확장할 수 있는지 정해요.'),
  '@accesscontrol.authorizationcheck': d('@AccessControl.authorizationCheck: #NOT_REQUIRED', '권한 검사(DCL) 여부예요. #CHECK면 DCL이 있어야 하고, #NOT_REQUIRED면 없어도 돼요.'),
  '@endusertext.label': d("@EndUserText.label: '설명'", '사용자에게 보이는 설명(라벨)이에요. 60자까지예요.'),
  '@metadata.allowextensions': d('@Metadata.allowExtensions: true', '메타데이터 확장(annotate)으로 어노테이션을 붙일 수 있게 해요.'),
  '@metadata.ignorepropagatedannotations': d('@Metadata.ignorePropagatedAnnotations: true', '아래 뷰에서 물려받은 어노테이션을 무시해요.'),
  '@metadata.layer': d('@Metadata.layer: #CORE', '메타데이터 확장의 층이에요 (#CORE < #LOCALIZATION < #INDUSTRY < #PARTNER < #CUSTOMER).'),
  '@objectmodel.usagetype': d('@ObjectModel.usageType: { serviceQuality: #X, sizeCategory: #S, dataClass: #MIXED }', '뷰의 성능 특성(데이터 양, 종류)을 알려 주는 정보예요.'),
  '@objectmodel.text.element': d("@ObjectModel.text.element: ['Text']", '이 필드의 설명 텍스트가 들어 있는 필드를 알려 줘요.'),
  '@semantics.amount.currencycode': d("@Semantics.amount.currencyCode: 'Currency'", '금액 필드에 통화 필드를 연결해요.'),
  '@semantics.quantity.unitofmeasure': d("@Semantics.quantity.unitOfMeasure: 'Unit'", '수량 필드에 단위 필드를 연결해요.'),
  '@ui.lineitem': d('@UI.lineItem: [{ position: 10 }]', 'Fiori 목록(테이블)의 열로 보여 줘요. position이 작을수록 앞에 와요.'),
  '@ui.identification': d('@UI.identification: [{ position: 10 }]', 'Fiori 상세 화면의 기본 정보 영역에 보여 줘요.'),
  '@ui.selectionfield': d('@UI.selectionField: [{ position: 10 }]', 'Fiori 목록 위 필터 바에 검색 조건으로 보여 줘요.'),
  '@ui.headerinfo': d("@UI.headerInfo: { typeName: 'Item', typeNamePlural: 'Items' }", 'Fiori 화면 머리글(제목, 개수 표시 이름)을 정해요.'),
  '@ui.facet': d("@UI.facet: [{ type: #IDENTIFICATION_REFERENCE, … }]", 'Fiori 상세 화면의 섹션 구성을 정해요.'),
  '@ui.hidden': d('@UI.hidden: true', 'Fiori 화면에서 이 필드를 숨겨요.'),
  '@search.searchable': d('@Search.searchable: true', '이 뷰에서 자유 검색을 쓸 수 있게 해요. 검색할 필드에 @Search.defaultSearchElement를 달아요.'),
  '@search.defaultsearchelement': d('@Search.defaultSearchElement: true', '자유 검색 때 이 필드에서 찾아요.'),
  '@consumption.valuehelpdefinition': d("@Consumption.valueHelpDefinition: [{ entity: { name: 'ZI_X', element: 'Key' } }]", '이 필드에 값 도움말(F4)을 붙여요.'),
  '@vdm.viewtype': d('@VDM.viewType: #BASIC', '가상 데이터 모델에서 이 뷰의 층이에요 (#BASIC, #COMPOSITE, #CONSUMPTION).'),
};

/* ───────── SQLScript (AMDP) ───────── */
const SQL: Record<string, Doc> = {
  procedure: d('METHOD m BY DATABASE PROCEDURE FOR HDB LANGUAGE SQLSCRIPT …', '이 메서드를 HANA DB 안에서 도는 SQLScript 프로시저로 만들어요 (AMDP).'),
  hdb: d('FOR HDB', 'SAP HANA DB용이라는 뜻이에요.'),
  sqlscript: d('LANGUAGE SQLSCRIPT', 'HANA의 SQL 확장 언어로 쓴다는 뜻이에요.'),
  options: d('OPTIONS READ-ONLY', '프로시저 옵션이에요. READ-ONLY면 읽기만 해요.'),
  'read-only': d('OPTIONS READ-ONLY', 'DB를 바꾸지 않고 읽기만 해요.'),
  using: d('USING dbtab zcl_other=>method', 'AMDP 안에서 쓸 ABAP 테이블·다른 AMDP를 모두 적어야 해요.'),
  select: d('lt = SELECT f1, f2 FROM dbtab WHERE …;', '결과를 테이블 변수에 담아요. 문장은 ;로 끝나요.'),
  declare: d('DECLARE lv_x NVARCHAR(10);', 'SQLScript 지역 변수를 선언해요.'),
  coalesce: d('COALESCE( a, b )', 'NULL이 아닌 첫 값을 돌려줘요.'),
  row_number: d('ROW_NUMBER( ) OVER ( PARTITION BY a ORDER BY b )', '그룹마다 순번을 매겨요.'),
  apply_filter: d('APPLY_FILTER( :lt, :lv_where )', '문자열로 받은 조건으로 테이블을 걸러요.'),
};

/* ───────── UI5 (JavaScript · XML 공통) ───────── */
const cls = (name: string, text: string, sig = ''): [string, Doc] => [name, { title: name, sig: sig || undefined, text, link: UI5_API(name) }];
const UI5_CLASSES: Record<string, Doc> = Object.fromEntries([
  cls('sap.m.Button', '누를 수 있는 버튼이에요. text, icon, type(Emphasized, Accept, Reject…)을 주고 press 이벤트로 동작을 붙여요.', 'new sap.m.Button({ text: "저장", press: function () { … } })'),
  cls('sap.m.Text', '글을 보여 주는 컨트롤이에요. 길면 줄바꿈되고, maxLines로 줄 수를 제한해요.', 'new sap.m.Text({ text: "Hello" })'),
  cls('sap.m.Title', '제목 글이에요. level(H1~H6)과 titleStyle로 크기를 정해요.'),
  cls('sap.m.Label', '입력칸 이름표예요. labelFor로 입력칸과 연결하고 required로 필수 표시를 해요.'),
  cls('sap.m.Input', '한 줄 입력칸이에요. value를 모델에 바인딩하고 change/liveChange로 입력을 받아요.', 'new sap.m.Input({ value: "{/name}", placeholder: "이름" })'),
  cls('sap.m.TextArea', '여러 줄 입력칸이에요.'),
  cls('sap.m.CheckBox', '체크박스예요. selected 속성과 select 이벤트를 써요.'),
  cls('sap.m.Switch', '켜기/끄기 스위치예요. state 속성과 change 이벤트를 써요.'),
  cls('sap.m.Select', '드롭다운 하나 고르기예요. items에 sap.ui.core.Item을 넣고 selectedKey로 값을 읽어요.'),
  cls('sap.m.ComboBox', '입력하면서 고르는 드롭다운이에요.'),
  cls('sap.m.DatePicker', '날짜 고르기예요. valueFormat으로 값 형식을, displayFormat으로 보이는 형식을 정해요.'),
  cls('sap.m.SearchField', '검색창이에요. search 이벤트(엔터·돋보기)와 liveChange 이벤트를 써요.'),
  cls('sap.m.Link', '링크 글이에요. href 또는 press 이벤트를 써요.'),
  cls('sap.m.Image', '이미지예요. src, width, height를 줘요.'),
  cls('sap.m.App', '앱의 맨 바깥 컨테이너예요. pages 안에 Page를 넣고 화면을 넘겨요 (NavContainer).'),
  cls('sap.m.Shell', '앱을 가운데 정렬된 틀로 감싸요 (데스크톱에서 너비 제한).'),
  cls('sap.m.Page', '제목 막대가 있는 화면 한 장이에요. content에 내용을, headerContent에 오른쪽 위 버튼을 넣어요. showNavButton으로 뒤로가기 버튼을 보여요.'),
  cls('sap.m.VBox', '자식들을 세로로 쌓아요 (FlexBox, direction=Column).'),
  cls('sap.m.HBox', '자식들을 가로로 나란히 놓아요 (FlexBox, direction=Row).'),
  cls('sap.m.FlexBox', 'CSS flexbox로 자식을 배치해요. alignItems, justifyContent를 써요.'),
  cls('sap.m.Panel', '제목이 있는 묶음 상자예요. expandable로 접었다 폈다 해요.'),
  cls('sap.m.Toolbar', '버튼 등을 가로로 놓는 막대예요.'),
  cls('sap.m.OverflowToolbar', '공간이 모자라면 넘치는 항목을 … 메뉴로 접는 툴바예요.'),
  cls('sap.m.ToolbarSpacer', '툴바에서 빈 공간을 채워 뒤의 항목을 오른쪽으로 밀어요.'),
  cls('sap.m.Table', '반응형 테이블이에요. columns에 Column, items에 ColumnListItem을 넣어요. items를 모델 배열에 바인딩해요.', '<Table items="{/items}"><columns>…</columns><items><ColumnListItem>…</ColumnListItem></items></Table>'),
  cls('sap.m.Column', 'sap.m.Table의 열이에요. header에 열 제목을 넣어요.'),
  cls('sap.m.ColumnListItem', 'sap.m.Table의 한 줄이에요. cells에 열 수만큼 컨트롤을 넣어요. type="Navigation"이면 눌러서 이동할 수 있어요.'),
  cls('sap.m.List', '목록이에요. items에 StandardListItem 등을 넣어요. mode로 고르기(SingleSelect, MultiSelect, Delete)를 정해요.'),
  cls('sap.m.StandardListItem', '제목·설명·아이콘이 있는 기본 목록 항목이에요.'),
  cls('sap.m.ObjectListItem', '제목과 숫자(금액 등), 상태를 같이 보여 주는 목록 항목이에요.'),
  cls('sap.m.CustomListItem', '안을 마음대로 꾸미는 목록 항목이에요.'),
  cls('sap.m.Dialog', '팝업 창이에요. open()/close()로 열고 닫고, beginButton/endButton에 버튼을 넣어요. 보통 Fragment로 만들어요.'),
  cls('sap.m.Popover', '눌렀던 컨트롤 옆에 뜨는 작은 팝업이에요. openBy(control)로 열어요.'),
  cls('sap.m.BusyDialog', '처리 중에 화면을 막고 로딩 표시를 보여 줘요.'),
  cls('sap.m.MessageToast', '잠깐 떴다 사라지는 알림이에요.', 'sap.m.MessageToast.show("저장했어요");'),
  cls('sap.m.MessageBox', '확인·경고·오류 창이에요. show, alert, confirm, error, success, warning, information이 있어요.', 'sap.m.MessageBox.confirm("지울까요?", { onClose: function (sAction) { … } });'),
  cls('sap.m.MessageStrip', '화면 안에 띠 모양으로 메시지를 보여 줘요. type은 Information, Success, Warning, Error예요.'),
  cls('sap.m.IconTabBar', '아이콘·글자 탭이에요. items에 IconTabFilter를 넣어요.'),
  cls('sap.m.IconTabFilter', 'IconTabBar의 탭 하나예요. key, text, icon, count를 줘요.'),
  cls('sap.m.ObjectHeader', '상세 화면 머리글이에요 (제목, 숫자, 속성).'),
  cls('sap.m.ObjectIdentifier', '이름(title)과 ID(text)를 굵게·작게 함께 보여 줘요.'),
  cls('sap.m.ObjectNumber', '숫자와 단위를 강조해서 보여 줘요 (금액 등). state로 색을 정해요.'),
  cls('sap.m.ObjectStatus', '상태 글과 아이콘을 색과 함께 보여 줘요 (state: Success, Warning, Error).'),
  cls('sap.m.Carousel', '옆으로 넘기는 슬라이드예요.'),
  cls('sap.m.NavContainer', '여러 페이지 사이를 이동하게 해 주는 컨테이너예요 (to, back).'),
  cls('sap.m.SplitApp', '왼쪽 목록 + 오른쪽 상세의 두 칸 앱이에요.'),
  cls('sap.f.DynamicPage', '스크롤하면 머리글이 접히는 Fiori 페이지예요. title, header, content를 넣어요.'),
  cls('sap.f.FlexibleColumnLayout', '목록-상세-상세상세를 1~3칸으로 보여 주는 레이아웃이에요.'),
  cls('sap.f.Card', '카드 모양 묶음이에요.'),
  cls('sap.ui.layout.form.SimpleForm', '라벨-입력칸 짝을 넣기만 하면 정렬해 주는 폼이에요. layout="ResponsiveGridLayout"을 많이 써요.'),
  cls('sap.ui.table.Table', '많은 데이터를 보여 주는 그리드 테이블이에요 (데스크톱용, 가상 스크롤).'),
  cls('sap.ui.core.mvc.Controller', '뷰의 동작(이벤트 처리)을 담는 컨트롤러예요. onInit, onBeforeRendering, onAfterRendering, onExit가 차례로 불려요.', 'Controller.extend("my.app.controller.Main", { onInit: function () { … } })'),
  cls('sap.ui.core.mvc.View', 'MVC의 뷰예요. XML 뷰는 <mvc:View controllerName="…">로 시작해요.'),
  cls('sap.ui.core.mvc.XMLView', 'XML로 만든 뷰예요. XMLView.create({ viewName })로 만들어요.'),
  cls('sap.ui.core.UIComponent', '앱 전체를 묶는 컴포넌트예요. manifest.json을 읽고, init에서 라우터를 시작해요.'),
  cls('sap.ui.core.Fragment', '컨트롤러 없이 재사용하는 뷰 조각이에요 (Dialog 등). Fragment.load({ name, controller: this })로 불러요.'),
  cls('sap.ui.core.FragmentDefinition', 'XML 프래그먼트의 맨 바깥 태그예요. 렌더링되지는 않아요.'),
  cls('sap.ui.core.Item', 'Select/ComboBox의 항목이에요 (key, text).'),
  cls('sap.ui.core.Icon', '아이콘이에요. src="sap-icon://add"처럼 써요.'),
  cls('sap.ui.core.HTML', 'HTML 조각을 그대로 넣어요.'),
  cls('sap.ui.core.Core', 'UI5 코어예요. sap.ui.getCore()로 가져와요.'),
  cls('sap.ui.model.json.JSONModel', 'JS 객체/JSON을 담는 클라이언트 모델이에요. setProperty/getProperty로 값을 바꾸고 읽으면 바인딩된 화면이 같이 바뀌어요.', 'var oModel = new sap.ui.model.json.JSONModel({ name: "" });'),
  cls('sap.ui.model.odata.v2.ODataModel', 'OData V2 서비스를 쓰는 모델이에요. read, create, update, remove로 서버와 주고받아요.'),
  cls('sap.ui.model.odata.v4.ODataModel', 'OData V4 서비스를 쓰는 모델이에요. RAP 서비스와 많이 써요.'),
  cls('sap.ui.model.resource.ResourceModel', 'i18n 문구 파일(i18n.properties)을 담는 모델이에요. {i18n>key}로 바인딩해요.'),
  cls('sap.ui.model.Filter', '목록 바인딩을 거르는 조건이에요.', 'new sap.ui.model.Filter("Name", sap.ui.model.FilterOperator.Contains, sQuery)'),
  cls('sap.ui.model.FilterOperator', 'Filter 비교 방식이에요: EQ, NE, Contains, StartsWith, EndsWith, BT, GT, GE, LT, LE.'),
  cls('sap.ui.model.Sorter', '목록 바인딩 정렬 조건이에요.', 'new sap.ui.model.Sorter("Name", bDescending)'),
  cls('sap.ui.Device', '기기 정보예요 (Device.system.phone, Device.browser 등).'),
]);
const UI5_SHORT: Record<string, string> = {};
for (const k of Object.keys(UI5_CLASSES)) UI5_SHORT[k.slice(k.lastIndexOf('.') + 1)] ??= k;

const JS: Record<string, Doc> = {
  'sap.ui.define': d('sap.ui.define(["모듈/경로"], function (Module) { … });', 'UI5 모듈을 정의해요. 앞 배열의 모듈을 불러온 뒤, 같은 순서로 함수 인자에 넣어 줘요.', UI5_API('sap.ui')),
  'sap.ui.require': d('sap.ui.require(["모듈/경로"], function (Module) { … });', '모듈을 비동기로 불러와 써요 (정의는 하지 않아요).', UI5_API('sap.ui')),
  'sap.ui.getCore': d('sap.ui.getCore()', 'UI5 코어 객체를 가져와요. attachInit, byId, setModel 등을 써요.', UI5_API('sap.ui.core.Core')),
  attachInit: d('sap.ui.getCore().attachInit(function () { … });', 'UI5가 다 불러와진 뒤에 실행할 코드를 등록해요. index.html에서 화면을 처음 그릴 때 써요.'),
  placeAt: d('oControl.placeAt("content");', '컨트롤을 HTML 요소(id)에 그려요.'),
  byId: d('this.byId("id") / this.getView().byId("id")', '뷰 안에서 id로 컨트롤을 찾아요. 컨트롤러에서는 this.byId가 가장 간단해요.'),
  getView: d('this.getView()', '컨트롤러에 연결된 뷰를 돌려줘요.'),
  setModel: d('oView.setModel(oModel, "name");', '모델을 붙여요. 이름을 주면 {name>/path}로, 안 주면 {/path}로 바인딩해요.'),
  getModel: d('oView.getModel("name")', '붙어 있는 모델을 가져와요. 이름이 없으면 기본 모델이에요.'),
  getProperty: d('oModel.getProperty("/path")', '모델에서 경로의 값을 읽어요.'),
  setProperty: d('oModel.setProperty("/path", value);', '모델 값을 바꿔요. 바인딩된 화면도 같이 바뀌어요.'),
  getData: d('oModel.getData()', 'JSONModel의 전체 데이터를 돌려줘요.'),
  setData: d('oModel.setData(oData);', 'JSONModel 데이터를 통째로 바꿔요.'),
  getOwnerComponent: d('this.getOwnerComponent()', '이 뷰를 가진 컴포넌트(Component.js)를 가져와요. 라우터, 전역 모델을 꺼낼 때 써요.'),
  getRouter: d('this.getOwnerComponent().getRouter()', '앱의 라우터를 가져와요 (manifest.json의 routing).'),
  navTo: d('oRouter.navTo("routeName", { id: "1" });', 'manifest.json에 정의한 라우트로 화면을 이동해요.'),
  getRoute: d('oRouter.getRoute("routeName")', '라우트 객체를 가져와요. attachPatternMatched로 그 화면에 왔을 때를 잡아요.'),
  attachPatternMatched: d('oRoute.attachPatternMatched(this._onMatched, this);', '이 라우트로 들어올 때마다 불릴 함수를 붙여요.'),
  getParameter: d('oEvent.getParameter("name")', '이벤트가 넘겨준 값을 꺼내요 (예: "value", "arguments", "listItem").'),
  getSource: d('oEvent.getSource()', '이벤트를 일으킨 컨트롤을 돌려줘요.'),
  getBindingContext: d('oControl.getBindingContext("model")', '컨트롤이 바인딩된 데이터 위치(컨텍스트)를 가져와요. 목록에서 누른 줄의 데이터를 꺼낼 때 써요.'),
  getObject: d('oContext.getObject()', '컨텍스트가 가리키는 데이터 객체를 돌려줘요.'),
  getPath: d('oContext.getPath()', '컨텍스트의 경로(예: /items/3)를 돌려줘요.'),
  bindElement: d('oView.bindElement("/items/0");', '뷰나 컨트롤을 데이터 한 건에 묶어요. 상세 화면에서 많이 써요.'),
  getBinding: d('oList.getBinding("items")', '속성·집합의 바인딩을 가져와요. filter, sort를 걸 때 써요.'),
  filter: d('oBinding.filter([oFilter]); / array.filter(fn)', 'UI5 바인딩이면 목록을 Filter로 걸러요. 배열이면 조건에 맞는 것만 남긴 새 배열을 만들어요.'),
  getResourceBundle: d('this.getOwnerComponent().getModel("i18n").getResourceBundle()', 'i18n 문구 묶음을 가져와요.'),
  getText: d('oBundle.getText("key", [arg])', 'i18n 문구를 가져와요.'),
  getValue: d('oInput.getValue()', '입력칸 값을 읽어요.'),
  setValue: d('oInput.setValue("text");', '입력칸 값을 바꿔요.'),
  getSelectedKey: d('oSelect.getSelectedKey()', 'Select에서 고른 항목의 key를 읽어요.'),
  setVisible: d('oControl.setVisible(false);', '컨트롤을 보이거나 숨겨요.'),
  setEnabled: d('oControl.setEnabled(false);', '컨트롤을 쓸 수 있게/없게 해요.'),
  setBusy: d('oControl.setBusy(true);', '컨트롤에 로딩 표시를 해요.'),
  addStyleClass: d('oControl.addStyleClass("sapUiSmallMargin");', 'CSS 클래스를 더해요.'),
  onInit: d('onInit: function () { … }', '컨트롤러가 처음 만들어질 때 한 번 불려요. 모델 붙이기, 라우트 연결을 여기서 해요.'),
  onBeforeRendering: d('onBeforeRendering: function () { … }', '뷰가 (다시) 그려지기 직전에 불려요.'),
  onAfterRendering: d('onAfterRendering: function () { … }', '뷰가 그려진 뒤에 불려요. DOM이 필요할 때 써요.'),
  onExit: d('onExit: function () { … }', '컨트롤러가 없어질 때 불려요. 정리 작업을 해요.'),
  extend: d('Controller.extend("이름", { … })', '부모 클래스를 이어받는 새 클래스를 만들어요. 첫 인자는 전체 이름(네임스페이스.controller.이름)이에요.'),
  init: d('init: function () { UIComponent.prototype.init.apply(this, arguments); … }', '컴포넌트가 시작할 때 불려요. 부모 init을 먼저 부르고 라우터를 시작해요.'),
  metadata: d('metadata: { manifest: "json" }', '컴포넌트 설정이에요. manifest: "json"이면 manifest.json을 읽어요.'),
  show: d('sap.m.MessageToast.show("text");', 'MessageToast/MessageBox를 띄워요.'),
  read: d('oModel.read("/EntitySet", { success, error, filters })', 'OData V2에서 데이터를 읽어요.'),
  create: d('oModel.create("/EntitySet", oData, { success, error })', 'OData V2로 새 데이터를 만들어요.'),
  update: d('oModel.update("/EntitySet(\'1\')", oData, { success, error })', 'OData V2로 데이터를 바꿔요.'),
  remove: d('oModel.remove("/EntitySet(\'1\')", { success, error })', 'OData V2로 데이터를 지워요.'),
  submitChanges: d('oModel.submitChanges({ success, error })', '모아 둔 변경을 서버에 보내요 (배치).'),
  refresh: d('oModel.refresh(true);', '모델(또는 바인딩)을 다시 읽거나 화면을 갱신해요.'),
  open: d('oDialog.open();', 'Dialog/Popover를 열어요.'),
  close: d('oDialog.close();', 'Dialog/Popover를 닫아요.'),
  destroy: d('oControl.destroy();', '컨트롤을 지우고 메모리를 돌려줘요.'),
  'console.log': d('console.log(value)', '브라우저 개발자 도구 콘솔에 값을 찍어요 (F12).'),
  log: d('console.log(value)', '브라우저 개발자 도구 콘솔에 값을 찍어요 (F12).'),
  'JSON.stringify': d('JSON.stringify(obj, null, 2)', '객체를 JSON 문자열로 바꿔요.'),
  'JSON.parse': d('JSON.parse(text)', 'JSON 문자열을 객체로 바꿔요.'),
  push: d('array.push(item)', '배열 끝에 넣어요.'),
  map: d('array.map(function (x) { return … })', '각 요소를 바꾼 새 배열을 만들어요.'),
  forEach: d('array.forEach(function (x, i) { … })', '배열을 하나씩 돌아요.'),
  find: d('array.find(function (x) { return … })', '조건에 맞는 첫 요소를 돌려줘요.'),
  includes: d('array.includes(x) / str.includes("a")', '들어 있는지 참/거짓으로 알려 줘요.'),
  length: d('array.length', '배열·문자열 길이예요.'),
  fetch: d('fetch(url).then(res => res.json())', '서버에 요청을 보내요 (Promise).'),
  then: d('promise.then(function (result) { … })', 'Promise가 끝나면 실행할 함수를 붙여요.'),
  const: d('const name = value;', '다시 대입할 수 없는 변수를 선언해요.'),
  let: d('let name = value;', '블록 안에서만 쓰는 변수를 선언해요.'),
  var: d('var name = value;', '함수 단위 변수를 선언해요 (옛 방식, UI5 예제에 많아요).'),
  function: d('function name(args) { … }', '함수를 만들어요.'),
  this: d('this', '지금 객체예요. 컨트롤러 함수 안에서는 컨트롤러예요. 콜백 안에서는 바뀔 수 있어서 .bind(this)나 var that = this를 써요.'),
  return: d('return value;', '함수를 끝내고 값을 돌려줘요.'),
  new: d('new ClassName(args)', '클래스로 새 객체를 만들어요.'),
  async: d('async function () { … }', '안에서 await를 쓸 수 있는 함수예요.'),
  await: d('await promise', 'Promise가 끝날 때까지 기다려요.'),
  typeof: d('typeof x', '값의 종류("string", "number" 등)를 알려 줘요.'),
};

/* ───────── UI5 XML 속성·집합 ───────── */
const XML_ATTR: Record<string, Doc> = {
  controllerName: d('controllerName="my.app.controller.Main"', '이 뷰와 연결할 컨트롤러의 전체 이름이에요 (네임스페이스.controller.이름).'),
  xmlns: d('xmlns="sap.m"', '접두어 없는 태그가 어느 라이브러리인지 정해요. 보통 sap.m이에요.'),
  'xmlns:mvc': d('xmlns:mvc="sap.ui.core.mvc"', 'mvc: 접두어를 sap.ui.core.mvc로 연결해요 (mvc:View).'),
  'xmlns:core': d('xmlns:core="sap.ui.core"', 'core: 접두어를 sap.ui.core로 연결해요 (core:Item, core:Fragment).'),
  'xmlns:f': d('xmlns:f="sap.ui.layout.form"', 'f: 접두어로 쓸 라이브러리를 연결해요. 폼이면 sap.ui.layout.form, Fiori 레이아웃이면 sap.f예요.'),
  displayBlock: d('displayBlock="true"', '뷰를 block으로 그려서 높이 100%가 잘 먹게 해요.'),
  id: d('id="myId"', '컨트롤 id예요. 컨트롤러에서 this.byId("myId")로 찾아요.'),
  text: d('text="글" / text="{i18n>key}" / text="{/path}"', '보여 줄 글이에요. {}로 모델에 바인딩할 수 있어요.'),
  press: d('press=".onPress"', '눌렀을 때 부를 컨트롤러 함수예요. 앞의 .은 "이 뷰의 컨트롤러에서 찾기"라는 뜻이에요.'),
  value: d('value="{/name}"', '입력칸 값이에요. 바인딩하면 입력이 모델에 바로 들어가요 (양방향).'),
  items: d('items="{/list}"', '목록·테이블에 넣을 항목들을 모델 배열에 바인딩해요. 안에 템플릿 항목을 하나 넣어요.'),
  title: d('title="제목"', '제목이에요.'),
  visible: d('visible="{= ${/count} > 0 }"', '보일지 말지예요. {= … } 식 바인딩도 쓸 수 있어요.'),
  enabled: d('enabled="false"', '쓸 수 있는지예요.'),
  editable: d('editable="true"', '고칠 수 있는지예요.'),
  width: d('width="100%"', '너비예요 (px, %, rem).'),
  class: d('class="sapUiSmallMargin"', 'CSS 클래스예요. UI5 여백 클래스(sapUiSmallMargin, sapUiTinyMarginTop 등)를 많이 써요.'),
  type: d('type="Emphasized"', '종류예요. Button이면 Default, Emphasized, Accept, Reject, Transparent, Ghost…, ListItem이면 Navigation, Active 등이에요.'),
  icon: d('icon="sap-icon://add"', 'UI5 아이콘이에요. 아이콘 탐색기에서 이름을 찾아요.'),
  placeholder: d('placeholder="입력하세요"', '비어 있을 때 보이는 안내 글이에요.'),
  change: d('change=".onChange"', '값이 바뀐 뒤(엔터·포커스 이동) 부를 함수예요.'),
  liveChange: d('liveChange=".onLiveChange"', '글자를 칠 때마다 부를 함수예요.'),
  select: d('select=".onSelect"', '항목을 골랐을 때 부를 함수예요.'),
  selectedKey: d('selectedKey="{/key}"', '고른 항목의 key예요.'),
  headerText: d('headerText="제목"', '머리글 글이에요 (Panel, List 등).'),
  mode: d('mode="SingleSelectMaster"', '목록 고르기 방식이에요 (None, SingleSelect, MultiSelect, Delete…).'),
  growing: d('growing="true"', '목록을 조금씩 더 불러와요 (growingThreshold 개씩).'),
  busy: d('busy="{/busy}"', '로딩 표시예요.'),
  key: d('key="A"', '항목의 값(키)이에요.'),
  labelFor: d('labelFor="inputId"', '이 Label이 어떤 입력칸의 이름인지 id로 연결해요.'),
  content: d('<content> … </content>', 'Page·Panel 등의 기본 내용 자리(aggregation)예요.'),
  cells: d('<cells> … </cells>', 'ColumnListItem의 칸들이에요. 열 수와 같아야 해요.'),
  columns: d('<columns> … </columns>', 'Table의 열 목록이에요.'),
  headerContent: d('<headerContent> … </headerContent>', 'Page 제목 막대 오른쪽에 넣을 컨트롤이에요.'),
  beginButton: d('<beginButton> <Button …/> </beginButton>', 'Dialog 아래 왼쪽(첫) 버튼이에요.'),
  endButton: d('<endButton> <Button …/> </endButton>', 'Dialog 아래 오른쪽(끝) 버튼이에요.'),
};
const XML_TAG_ALIAS: Record<string, string> = {
  'mvc:View': 'sap.ui.core.mvc.View', 'core:FragmentDefinition': 'sap.ui.core.FragmentDefinition', 'core:Item': 'sap.ui.core.Item', 'core:Icon': 'sap.ui.core.Icon',
  'f:SimpleForm': 'sap.ui.layout.form.SimpleForm', 'form:SimpleForm': 'sap.ui.layout.form.SimpleForm', 't:Table': 'sap.ui.table.Table', 'table:Table': 'sap.ui.table.Table',
  'f:DynamicPage': 'sap.f.DynamicPage', 'f:Card': 'sap.f.Card',
};

/* ───────── HTML ───────── */
const tag = (t: string, text: string): [string, Doc] => [t, { sig: `<${t}>`, text, link: MDN_HTML(t) }];
const HTML_TAGS: Record<string, Doc> = Object.fromEntries([
  tag('html', '문서 전체를 감싸요. lang으로 언어를 정해요.'), tag('head', '제목, 메타 정보, 스크립트·스타일을 넣는 곳이에요.'), tag('body', '화면에 보이는 내용이에요.'),
  tag('div', '구역을 나누는 블록 요소예요.'), tag('span', '글 일부를 감싸는 인라인 요소예요.'), tag('p', '문단이에요.'), tag('a', '링크예요 (href).'),
  tag('img', '이미지예요 (src, alt).'), tag('input', '입력칸이에요 (type).'), tag('button', '버튼이에요. form 안에서는 type="button"을 주지 않으면 제출 버튼이 돼요.'),
  tag('form', '입력 폼이에요.'), tag('ul', '순서 없는 목록이에요.'), tag('li', '목록 항목이에요.'), tag('table', '표예요.'),
  tag('script', '자바스크립트를 넣거나 불러와요 (src). UI5는 id="sap-ui-bootstrap"인 script로 시작해요.'), tag('link', '외부 CSS 등을 연결해요.'), tag('meta', '문서 정보예요 (charset, viewport).'),
  tag('title', '브라우저 탭 제목이에요.'), tag('style', '문서 안에 CSS를 적어요.'),
]);
const HTML_ATTR: Record<string, Doc> = {
  id: d('id="name"', '요소 id예요. UI5에서는 placeAt("content")처럼 이 id에 그려요.'),
  class: d('class="a b"', 'CSS 클래스예요.'),
  href: d('href="url"', '링크 주소예요.'),
  src: d('src="url"', '불러올 파일 주소예요. UI5 부트스트랩이면 sap-ui-core.js 주소이고, 버전을 넣으면 그 버전을 써요 (…/1.120.2/resources/sap-ui-core.js).'),
  'data-sap-ui-theme': d('data-sap-ui-theme="sap_horizon"', 'UI5 테마예요. sap_horizon이 최신 기본 테마예요.'),
  'data-sap-ui-libs': d('data-sap-ui-libs="sap.m"', '처음에 불러올 UI5 라이브러리예요. 기초 수업처럼 sap.m 컨트롤을 쓰려면 꼭 있어야 해요.'),
  'data-sap-ui-resourceroots': d('data-sap-ui-resourceroots=\'{ "my.app": "./" }\'', '내 앱 네임스페이스가 어느 폴더인지 알려 줘요.'),
  'data-sap-ui-oninit': d('data-sap-ui-oninit="module:sap/ui/core/ComponentSupport"', 'UI5가 준비되면 실행할 모듈이에요. ComponentSupport면 data-sap-ui-component div에 컴포넌트를 띄워요.'),
  'data-sap-ui-compatversion': d('data-sap-ui-compatVersion="edge"', '호환성 모드예요. edge면 최신 동작을 써요.'),
  'data-sap-ui-async': d('data-sap-ui-async="true"', '모듈을 비동기로 불러와요 (권장).'),
  'data-sap-ui-component': d('<div data-sap-ui-component data-name="my.app">', 'ComponentSupport가 이 div에 컴포넌트(data-name)를 띄워요.'),
};

/* ───────── CSS ───────── */
const css = (p: string, text: string): [string, Doc] => [p, { sig: `${p}: …;`, text, link: MDN_CSS(p) }];
const CSS: Record<string, Doc> = Object.fromEntries([
  css('display', '배치 방식이에요: block, inline, flex, grid, none(숨김).'), css('position', '위치 방식이에요: static, relative, absolute, fixed, sticky.'),
  css('flex', '플렉스 아이템이 남는 공간을 얼마나 차지할지예요 (flex: 1).'), css('justify-content', '주축(가로) 정렬이에요: flex-start, center, space-between…'),
  css('align-items', '교차축(세로) 정렬이에요: stretch, center, flex-start…'), css('flex-direction', '플렉스 방향이에요: row, column.'), css('gap', '플렉스·그리드 아이템 사이 간격이에요.'),
  css('margin', '바깥 여백이에요 (위 오른쪽 아래 왼쪽).'), css('padding', '안쪽 여백이에요.'), css('border', '테두리예요 (두께 종류 색).'), css('border-radius', '모서리 둥글기예요.'),
  css('color', '글자 색이에요.'), css('background', '배경 (색, 이미지)이에요.'), css('background-color', '배경 색이에요.'), css('font-size', '글자 크기예요.'), css('font-weight', '글자 굵기예요 (400 보통, 700 굵게).'),
  css('width', '너비예요.'), css('height', '높이예요.'), css('max-width', '최대 너비예요.'), css('box-sizing', 'border-box면 너비에 padding·border가 포함돼요.'), css('overflow', '넘친 내용 처리예요: visible, hidden, auto, scroll.'),
  css('z-index', '겹칠 때 위아래 순서예요 (position이 있어야 해요).'), css('grid-template-columns', '그리드 열 크기예요 (repeat(3, 1fr)).'), css('opacity', '투명도예요 (0~1).'),
  css('transition', '값이 바뀔 때 부드럽게 바꿔요.'), css('text-align', '글 정렬이에요.'), css('line-height', '줄 높이예요.'), css('cursor', '마우스 모양이에요 (pointer).'),
]);

/* ───────── JSON (manifest.json) ───────── */
const JSON_KEYS: Record<string, Doc> = {
  'sap.app': d('"sap.app": { "id": … }', '앱 정보예요: id(네임스페이스), 제목, 데이터 소스(OData 서비스).'),
  'sap.ui': d('"sap.ui": { "technology": "UI5" }', 'UI 기술, 아이콘, 지원 기기 정보예요.'),
  'sap.ui5': d('"sap.ui5": { "rootView": …, "routing": … }', 'UI5 설정이에요: 첫 뷰, 의존 라이브러리, 모델, 라우팅.'),
  id: d('"id": "zproject1"', '앱 id예요. 네임스페이스와 같아야 하고, 컨트롤러·뷰 이름 앞에 붙어요.'),
  dataSources: d('"dataSources": { "mainService": { "uri": "/sap/opu/odata/…" } }', 'OData 서비스 주소예요. models에서 dataSource로 연결해요.'),
  models: d('"models": { "": { "dataSource": "mainService" } }', '앱이 시작할 때 만들 모델이에요. 이름 ""은 기본 모델, "i18n"은 문구 모델이에요.'),
  rootView: d('"rootView": { "viewName": "zproject1.view.App", "type": "XML" }', '앱이 처음 띄울 뷰예요.'),
  dependencies: d('"dependencies": { "minUI5Version": "1.120.2", "libs": { "sap.m": {} } }', '필요한 UI5 버전과 라이브러리예요.'),
  minUI5Version: d('"minUI5Version": "1.120.2"', '이 앱이 동작하는 최소 UI5 버전이에요.'),
  libs: d('"libs": { "sap.m": {} }', '불러올 UI5 라이브러리 목록이에요.'),
  routing: d('"routing": { "config": …, "routes": […], "targets": {…} }', '화면 이동 설정이에요. routes(주소 패턴) → targets(띄울 뷰).'),
  routes: d('{ "name": "RouteMain", "pattern": "", "target": ["TargetMain"] }', '주소 패턴과 띄울 타깃이에요. navTo("name")으로 이동해요.'),
  targets: d('"TargetMain": { "viewName": "Main" }', '라우트가 띄울 뷰 설정이에요.'),
  config: d('"config": { "routerClass": "sap.m.routing.Router", "viewPath": … }', '라우팅 공통 설정이에요 (뷰 경로, 넣을 컨트롤 id·aggregation).'),
  viewPath: d('"viewPath": "zproject1.view"', '뷰 파일이 있는 네임스페이스예요.'),
  controlId: d('"controlId": "app"', '뷰를 넣을 컨트롤 id예요 (보통 App.view.xml의 <App id="app">).'),
  controlAggregation: d('"controlAggregation": "pages"', '그 컨트롤의 어느 자리에 넣을지예요 (App이면 pages).'),
  i18n: d('"i18n": "i18n/i18n.properties"', '문구 파일 위치예요.'),
  _version: d('"_version": "1.59.0"', 'manifest 형식 버전이에요 (UI5 버전과는 달라요).'),
};

/* ───────── 찾기 ───────── */

export type HoverCtx = 'tag' | 'attr' | 'prop' | null;

/** 줄에서 col 자리에 있는 낱말. 없으면 null. */
export function wordAt(line: string, col: number, lang: string): { word: string; start: number; end: number; ctx: HoverCtx; chain: string } | null {
  const re = lang === 'ABAP' ? /[A-Za-z_][\w-]*(?:~\w+)?/g
    : lang === 'CDS' ? /[@$]?[A-Za-z_][\w.]*/g
    : lang === 'SQLScript' || lang === 'SQL' ? /[A-Za-z_][\w-]*/g
    : lang === 'XML' || lang === 'HTML' ? /[A-Za-z_][\w:.-]*/g
    : lang === 'CSS' ? /[A-Za-z_-][\w-]*/g
    : lang === 'JSON' ? /[A-Za-z_$][\w.$-]*/g
    : /[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*/g;
  for (const m of line.matchAll(re)) {
    const s = m.index!, e = s + m[0].length;
    if (col < s || col >= e) continue;
    let word = m[0], chain = m[0];
    if (lang === 'JavaScript' || !['ABAP', 'CDS', 'SQLScript', 'SQL', 'XML', 'HTML', 'CSS', 'JSON'].includes(lang)) {
      // sap.m.MessageToast.show 에서 MessageToast 위면 sap.m.MessageToast까지
      const dot = m[0].indexOf('.', col - s);
      chain = dot < 0 ? m[0] : m[0].slice(0, dot);
      word = chain.slice(chain.lastIndexOf('.') + 1);
    }
    const before = line.slice(0, s), after = line.slice(e);
    const ctx: HoverCtx = (lang === 'XML' || lang === 'HTML') ? (/<\/?$/.test(before) ? 'tag' : /^\s*=/.test(after) ? 'attr' : null)
      : lang === 'CSS' ? (/^\s*:/.test(after) ? 'prop' : null) : null;
    return { word, start: s, end: e, ctx, chain };
  }
  return null;
}

/** 낱말에 맞는 설명. 없으면 null. */
export function lookup(hit: { word: string; chain: string; ctx: HoverCtx }, lang: string): Doc | null {
  const { word, chain, ctx } = hit;
  const lw = word.toLowerCase();
  const titled = (title: string, doc: Doc | undefined): Doc | null => (doc ? { ...doc, title: doc.title ?? title } : null);
  switch (lang) {
    case 'ABAP': return titled(word, ABAP[lw] ?? ABAP[ABAP_ALIAS[lw]]);
    case 'CDS': {
      if (word.startsWith('@')) {
        let k = lw;
        while (k.includes('.')) { if (CDS[k]) return titled(word, CDS[k]); k = k.slice(0, k.lastIndexOf('.')); }
        return null;
      }
      return titled(word, CDS[lw]);
    }
    case 'SQLScript': case 'SQL': return titled(word, SQL[lw] ?? ABAP[lw]);
    case 'XML': {
      if (ctx === 'attr') return titled(word, XML_ATTR[word]);
      if (ctx === 'tag') {
        const full = XML_TAG_ALIAS[word] ?? (word.includes(':') ? null : `sap.m.${word}`);
        if (full && UI5_CLASSES[full]) return UI5_CLASSES[full];
        return titled(word, XML_ATTR[word]); // <content> 같은 집합
      }
      return null;
    }
    case 'HTML': {
      if (ctx === 'tag') return titled(word, HTML_TAGS[lw]);
      if (ctx === 'attr') return titled(word, HTML_ATTR[lw]);
      return null;
    }
    case 'CSS': return ctx === 'prop' ? titled(word, CSS[lw]) : null;
    case 'JSON': return titled(word, JSON_KEYS[word]);
    default: {
      if (UI5_CLASSES[chain]) return UI5_CLASSES[chain];
      if (JS[chain]) return titled(chain, JS[chain]);
      const two = chain.split('.').slice(-2).join('.');
      if (JS[two]) return titled(two, JS[two]);
      // sap.m 까지만 친 네임스페이스
      if (/^sap(\.[a-z]\w*)*$/.test(chain)) return { title: chain, text: 'UI5 네임스페이스예요. 점(.)을 찍으면 안에 있는 것들이 자동완성으로 나와요.' };
      if (chain === word && UI5_SHORT[word] && /^[A-Z]/.test(word)) return UI5_CLASSES[UI5_SHORT[word]];
      return titled(word, JS[word]);
    }
  }
}

const reEsc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** 이 코드 안에서 이름을 선언한 줄 (VS Code의 변수 정보 대신). 0부터 센 줄 번호. */
export function findDecl(code: string, word: string, lang: string): { line: number; text: string } | null {
  if (word.length < 2) return null;
  const w = reEsc(word);
  const pats: RegExp[] = lang === 'ABAP' || lang === 'SQLScript' ? [
    new RegExp(`\\b(?:data|constants|types|parameters|select-options|field-symbols|class-data|statics)\\b[^.]*?[\\s:,]<?${w}>?(?=[\\s>.,]|$)`, 'i'),
    new RegExp(`\\b(?:data|field-symbol)\\(\\s*<?${w}>?\\s*\\)`, 'i'),
    new RegExp(`\\b(?:methods|class-methods|class|interface|form)\\s+${w}\\b`, 'i'),
    new RegExp(`\\b(?:importing|exporting|changing|returning)\\b.*?\\b(?:value\\()?${w}\\)?\\s+type\\b`, 'i'),
    ...(lang === 'SQLScript' ? [new RegExp(`\\bdeclare\\s+${w}\\b`, 'i'), new RegExp(`^\\s*${w}\\s*=`, 'i')] : []),
  ] : lang === 'CDS' ? [
    new RegExp(`\\bas\\s+${w}\\b`, 'i'), new RegExp(`\\bentity\\s+${w}\\b`, 'i'),
  ] : lang === 'XML' ? [new RegExp(`\\bid="${w}"`)]
    : lang === 'HTML' || lang === 'CSS' || lang === 'JSON' ? []
    : [
      new RegExp(`\\b(?:const|let|var)\\s+${w}\\b`), new RegExp(`\\bfunction\\s+${w}\\b`), new RegExp(`(?:^|[\\s,{])${w}\\s*:\\s*function\\b`),
      new RegExp(`\\bfunction\\s*\\w*\\s*\\([^)]*\\b${w}\\b[^)]*\\)`), new RegExp(`\\(([^()]*\\b${w}\\b[^()]*)\\)\\s*=>`),
    ];
  const lines = code.split('\n');
  for (const re of pats) {
    const i = lines.findIndex((l) => re.test(l) && !/^\s*(\*|\/\/|")/.test(l));
    if (i >= 0) return { line: i, text: lines[i].trim() };
  }
  return null;
}
