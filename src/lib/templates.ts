/**
 * 프로젝트·객체를 새로 만들면 도구가 기본으로 넣어 주는 코드
 * (SAP Business Application Studio의 SAPUI5 기본 앱 생성기, ABAP Development Tools(Eclipse)의 새 객체 템플릿).
 * %NAME%은 파일 이름에서, %NS%는 앱 네임스페이스(기본 zproject1)로 바꿔요. $0은 넣은 뒤 커서 자리예요.
 */
export interface Template {
  id: string;
  lang: string;
  /** 칩과 자동완성 목록에 보이는 이름 */
  label: string;
  /** 어디서 만들어 주는 코드인지 */
  from: string;
  /** 파일 이름 (%NAME% 자리에 이름이 들어가요) */
  file: string;
  /** 파일 이름이 없을 때 쓸 이름 */
  name: string;
  body: string;
}

const NS = 'zproject1';
const BAS = 'BAS 생성기';
const ADT = 'ADT 새 객체';

export const TEMPLATES: Template[] = [
  /* ───────── SAPUI5 (BAS · SAPUI5 basic 앱) ───────── */
  {
    id: 'ui5-component', lang: 'JavaScript', label: 'Component.js', from: BAS, file: 'Component.js', name: 'Component',
    body: `/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define([
        "sap/ui/core/UIComponent",
        "sap/ui/Device",
        "%NS%/model/models"
    ],
    function (UIComponent, Device, models) {
        "use strict";

        return UIComponent.extend("%NS%.Component", {
            metadata: {
                manifest: "json"
            },

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: function () {
                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);

                // enable routing
                this.getRouter().initialize();

                // set the device model
                this.setModel(models.createDeviceModel(), "device");$0
            }
        });
    }
);
`,
  },
  {
    id: 'ui5-controller', lang: 'JavaScript', label: 'View1.controller.js', from: BAS, file: '%NAME%.controller.js', name: 'View1',
    body: `sap.ui.define([
    "sap/ui/core/mvc/Controller"
],
/**
 * @param {typeof sap.ui.core.mvc.Controller} Controller
 */
function (Controller) {
    "use strict";

    return Controller.extend("%NS%.controller.%NAME%", {
        onInit: function () {
            $0
        }
    });
});
`,
  },
  {
    id: 'ui5-app-controller', lang: 'JavaScript', label: 'App.controller.js', from: BAS, file: 'App.controller.js', name: 'App',
    body: `sap.ui.define(
    [
        "sap/ui/core/mvc/Controller"
    ],
    function(BaseController) {
      "use strict";

      return BaseController.extend("%NS%.controller.App", {
        onInit: function() {
          $0
        }
      });
    }
  );
`,
  },
  {
    id: 'ui5-models', lang: 'JavaScript', label: 'model/models.js', from: BAS, file: 'models.js', name: 'models',
    body: `sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
],
function (JSONModel, Device) {
    "use strict";

    return {
        /**
         * Provides runtime info for the device the UI5 app is running on as JSONModel
         */
        createDeviceModel: function () {
            var oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        }$0
    };

});
`,
  },
  {
    id: 'ui5-basic-js', lang: 'JavaScript', label: '기초: sap.m 컨트롤 화면에 놓기', from: '기초 수업', file: 'index.js', name: 'index',
    body: `sap.ui.getCore().attachInit(function () {
    "use strict";

    new sap.m.Button({
        text: "Hello",
        press: function () {
            sap.m.MessageToast.show("Hello UI5");
        }
    }).placeAt("content");$0
});
`,
  },
  {
    id: 'ui5-view', lang: 'XML', label: 'View1.view.xml', from: BAS, file: '%NAME%.view.xml', name: 'View1',
    body: `<mvc:View controllerName="%NS%.controller.%NAME%"
    xmlns:mvc="sap.ui.core.mvc" displayBlock="true"
    xmlns="sap.m">
    <Page id="page" title="{i18n>title}">
        <content>
            $0
        </content>
    </Page>
</mvc:View>
`,
  },
  {
    id: 'ui5-app-view', lang: 'XML', label: 'App.view.xml', from: BAS, file: 'App.view.xml', name: 'App',
    body: `<mvc:View controllerName="%NS%.controller.App"
    xmlns:html="http://www.w3.org/1999/xhtml"
    xmlns:mvc="sap.ui.core.mvc" displayBlock="true"
    xmlns="sap.m">
    <App id="app">$0
    </App>
</mvc:View>
`,
  },
  {
    id: 'ui5-fragment', lang: 'XML', label: 'Fragment.fragment.xml', from: 'UI5 기본', file: '%NAME%.fragment.xml', name: 'Dialog',
    body: `<core:FragmentDefinition
    xmlns="sap.m"
    xmlns:core="sap.ui.core">
    <Dialog id="%NAME%" title="Title">
        $0
        <beginButton>
            <Button text="OK" press=".onCloseDialog" />
        </beginButton>
    </Dialog>
</core:FragmentDefinition>
`,
  },
  {
    id: 'ui5-index', lang: 'HTML', label: 'index.html', from: BAS, file: 'index.html', name: 'index',
    body: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>App Title</title>
    <style>
        html, body, body > div, #container, #container-uiarea {
            height: 100%;
        }
    </style>
    <script
        id="sap-ui-bootstrap"
        src="resources/sap-ui-core.js"
        data-sap-ui-theme="sap_horizon"
        data-sap-ui-resourceroots='{
            "%NS%": "./"
        }'
        data-sap-ui-oninit="module:sap/ui/core/ComponentSupport"
        data-sap-ui-compatVersion="edge"
        data-sap-ui-async="true"
        data-sap-ui-frameOptions="trusted"
    ></script>
</head>
<body class="sapUiBody sapUiSizeCompact" id="content">
    <div
        data-sap-ui-component
        data-name="%NS%"
        data-id="container"
        data-settings='{"id" : "%NS%"}'
        data-handle-validation="true"
    ></div>$0
</body>
</html>
`,
  },
  {
    id: 'ui5-basic-html', lang: 'HTML', label: '기초: index.html (부트스트랩)', from: '기초 수업', file: 'index.html', name: 'index',
    body: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>SAPUI5</title>
    <script
        id="sap-ui-bootstrap"
        src="https://ui5.sap.com/1.120.2/resources/sap-ui-core.js"
        data-sap-ui-theme="sap_horizon"
        data-sap-ui-libs="sap.m"
        data-sap-ui-compatVersion="edge">
    </script>
    <script>
        sap.ui.getCore().attachInit(function () {
            new sap.m.Text({ text: "Hello UI5" }).placeAt("content");$0
        });
    </script>
</head>
<body class="sapUiBody" id="content">
</body>
</html>
`,
  },
  {
    id: 'ui5-css', lang: 'CSS', label: 'css/style.css', from: BAS, file: 'style.css', name: 'style',
    body: `/* Enter your custom styles here */
$0`,
  },
  {
    id: 'ui5-manifest', lang: 'JSON', label: 'manifest.json', from: BAS, file: 'manifest.json', name: 'manifest',
    body: `{
  "_version": "1.59.0",
  "sap.app": {
    "id": "%NS%",
    "type": "application",
    "i18n": "i18n/i18n.properties",
    "applicationVersion": {
      "version": "0.0.1"
    },
    "title": "{{appTitle}}",
    "description": "{{appDescription}}",
    "resources": "resources.json"
  },
  "sap.ui": {
    "technology": "UI5",
    "icons": {
      "icon": "",
      "favIcon": "",
      "phone": "",
      "phone@2": "",
      "tablet": "",
      "tablet@2": ""
    },
    "deviceTypes": {
      "desktop": true,
      "tablet": true,
      "phone": true
    }
  },
  "sap.ui5": {
    "flexEnabled": false,
    "dependencies": {
      "minUI5Version": "1.120.2",
      "libs": {
        "sap.m": {},
        "sap.ui.core": {}
      }
    },
    "contentDensities": {
      "compact": true,
      "cozy": true
    },
    "models": {
      "i18n": {
        "type": "sap.ui.model.resource.ResourceModel",
        "settings": {
          "bundleName": "%NS%.i18n.i18n"
        }
      }
    },
    "resources": {
      "css": [
        {
          "uri": "css/style.css"
        }
      ]
    },
    "routing": {
      "config": {
        "routerClass": "sap.m.routing.Router",
        "viewType": "XML",
        "async": true,
        "viewPath": "%NS%.view",
        "controlAggregation": "pages",
        "controlId": "app",
        "clearControlAggregation": false
      },
      "routes": [
        {
          "name": "RouteView1",
          "pattern": ":?query:",
          "target": [
            "TargetView1"
          ]
        }
      ],
      "targets": {
        "TargetView1": {
          "viewType": "XML",
          "transition": "slide",
          "clearControlAggregation": false,
          "viewId": "View1",
          "viewName": "View1"
        }
      }
    },
    "rootView": {
      "viewName": "%NS%.view.App",
      "type": "XML",
      "async": true,
      "id": "App"
    }
  }
}
`,
  },

  /* ───────── ABAP (ADT) ───────── */
  {
    id: 'abap-report', lang: 'ABAP', label: 'REPORT (새 프로그램)', from: ADT, file: '%NAME%.prog.abap', name: 'zr_program',
    body: `*&---------------------------------------------------------------------*
*& Report %NAME%
*&---------------------------------------------------------------------*
*&
*&---------------------------------------------------------------------*
REPORT %NAME%.

$0`,
  },
  {
    id: 'abap-class', lang: 'ABAP', label: 'CLASS (새 클래스)', from: ADT, file: '%NAME%.clas.abap', name: 'zcl_class',
    body: `CLASS %NAME% DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC .

  PUBLIC SECTION.
  PROTECTED SECTION.
  PRIVATE SECTION.
ENDCLASS.



CLASS %NAME% IMPLEMENTATION.
$0
ENDCLASS.
`,
  },
  {
    id: 'abap-classrun', lang: 'ABAP', label: 'CLASS + if_oo_adt_classrun (콘솔 출력)', from: ADT, file: '%NAME%.clas.abap', name: 'zcl_hello',
    body: `CLASS %NAME% DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC .

  PUBLIC SECTION.

    INTERFACES if_oo_adt_classrun .
  PROTECTED SECTION.
  PRIVATE SECTION.
ENDCLASS.



CLASS %NAME% IMPLEMENTATION.


  METHOD if_oo_adt_classrun~main.
    out->write( 'Hello World' ).$0
  ENDMETHOD.
ENDCLASS.
`,
  },
  {
    id: 'abap-interface', lang: 'ABAP', label: 'INTERFACE (새 인터페이스)', from: ADT, file: '%NAME%.intf.abap', name: 'zif_interface',
    body: `INTERFACE %NAME%
  PUBLIC .
$0
ENDINTERFACE.
`,
  },

  /* ───────── CDS (ADT 새 Data Definition) ───────── */
  {
    id: 'cds-view-entity', lang: 'CDS', label: 'Define View Entity', from: ADT, file: '%NAME%.ddls.asddls', name: 'ZI_View',
    body: `@AbapCatalog.viewEnhancementCategory: [#NONE]
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'View Entity'
@Metadata.ignorePropagatedAnnotations: true
@ObjectModel.usageType:{
    serviceQuality: #X,
    sizeCategory: #S,
    dataClass: #MIXED
}
define view entity %NAME% as select from data_source_name
{
    $0
}
`,
  },
  {
    id: 'cds-root-view-entity', lang: 'CDS', label: 'Define Root View Entity (RAP)', from: ADT, file: '%NAME%.ddls.asddls', name: 'ZR_View',
    body: `@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Root View Entity'
define root view entity %NAME% as select from data_source_name
{
    $0
}
`,
  },
  {
    id: 'cds-view', lang: 'CDS', label: 'Define View (sqlViewName)', from: ADT, file: '%NAME%.ddls.asddls', name: 'ZCDS_VIEW',
    body: `@AbapCatalog.sqlViewName: 'ZV_SQL_VIEW'
@AbapCatalog.compiler.compareFilter: true
@AbapCatalog.preserveKey: true
@AccessControl.authorizationCheck: #CHECK
@EndUserText.label: 'CDS View'
define view %NAME% as select from data_source_name {
    $0
}
`,
  },
  {
    id: 'cds-projection', lang: 'CDS', label: 'Define Projection View', from: ADT, file: '%NAME%.ddls.asddls', name: 'ZC_View',
    body: `@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Projection View'
@Metadata.allowExtensions: true
define root view entity %NAME%
  provider contract transactional_query
  as projection on ZR_View
{
    $0
}
`,
  },
  {
    id: 'cds-metadata-ext', lang: 'CDS', label: 'Metadata Extension', from: ADT, file: '%NAME%.ddlx.asddlxs', name: 'ZC_View',
    body: `@Metadata.layer: #CORE
annotate entity %NAME%
    with
{
    $0
}
`,
  },
  {
    id: 'cds-service', lang: 'CDS', label: 'Service Definition', from: ADT, file: '%NAME%.srvd.srvdsrv', name: 'ZUI_SERVICE',
    body: `@EndUserText.label: 'Service Definition'
define service %NAME% {
  expose ZC_View;$0
}
`,
  },

  /* ───────── SQLScript (AMDP) ───────── */
  {
    id: 'amdp-class', lang: 'SQLScript', label: 'AMDP 클래스', from: 'ABAP for HANA', file: '%NAME%.clas.abap', name: 'zcl_amdp',
    body: `CLASS %NAME% DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC .

  PUBLIC SECTION.
    INTERFACES if_amdp_marker_hdb .

    TYPES: BEGIN OF ty_result,
             carrid TYPE s_carr_id,
             connid TYPE s_conn_id,
           END OF ty_result,
           tt_result TYPE STANDARD TABLE OF ty_result WITH EMPTY KEY.

    CLASS-METHODS get_data
      EXPORTING VALUE(et_result) TYPE tt_result.
  PROTECTED SECTION.
  PRIVATE SECTION.
ENDCLASS.



CLASS %NAME% IMPLEMENTATION.

  METHOD get_data BY DATABASE PROCEDURE
                  FOR HDB
                  LANGUAGE SQLSCRIPT
                  OPTIONS READ-ONLY
                  USING spfli.

    et_result = SELECT carrid, connid
                  FROM spfli;$0
  ENDMETHOD.
ENDCLASS.
`,
  },
];

export const templatesFor = (lang: string) => TEMPLATES.filter((t) => t.lang === lang);

/** 파일 이름에서 객체 이름을 꺼내요. 템플릿과 맞는 파일 이름이 아니면 기본 이름을 써요. */
export function templateName(t: Template, file: string): string {
  const base = file.trim().split(/[\\/]/).pop() ?? '';
  const suffix = t.file.includes('%NAME%') ? t.file.replace('%NAME%', '').toLowerCase() : '';
  if (!base || !suffix || !base.toLowerCase().endsWith(suffix)) return t.name;
  const stem = base.slice(0, base.length - suffix.length);
  return /^[\w/-]+$/.test(stem) ? stem : t.name;
}

/** 템플릿을 채운 글 ($0 표시는 남겨 둬요) 과 파일 이름 */
export function fillTemplate(t: Template, file = ''): { body: string; file: string } {
  const name = templateName(t, file);
  return { body: t.body.replace(/%NAME%/g, name).replace(/%NS%/g, NS), file: t.file.replace('%NAME%', name) };
}

/** 여러 파일을 한 번에 넣는 기본 세트 (한 글에 여러 파일) */
export const TEMPLATE_SETS: { id: string; label: string; detail: string; ids: string[] }[] = [
  { id: 'ui5-app', label: 'UI5 기본 앱', detail: 'BAS 생성기 파일 9개', ids: ['ui5-manifest', 'ui5-component', 'ui5-index', 'ui5-app-view', 'ui5-app-controller', 'ui5-view', 'ui5-controller', 'ui5-models', 'ui5-css'] },
  { id: 'rap', label: 'RAP 기본 (CDS)', detail: 'Root·Projection·Metadata·Service', ids: ['cds-root-view-entity', 'cds-projection', 'cds-metadata-ext', 'cds-service'] },
];

/** 세트의 파일들 (커서 표시 $0은 빼요) */
export function templateSetFiles(setId: string): { name: string; lang: string; code: string }[] {
  const set = TEMPLATE_SETS.find((s) => s.id === setId);
  if (!set) return [];
  return set.ids.map((id) => TEMPLATES.find((t) => t.id === id)!).map((t) => {
    const f = fillTemplate(t);
    return { name: f.file, lang: t.lang, code: f.body.replace(/\$0/g, '') };
  });
}
