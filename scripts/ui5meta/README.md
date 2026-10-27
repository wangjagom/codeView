# ui5meta.json 다시 만들기

에디터 자동완성(컨트롤·속성·이벤트·enum 값·모듈 경로·메서드)은 `src/lib/ui5meta.json`을 써요.
OpenUI5를 실제로 불러 각 컨트롤의 metadata를 읽어서 만들었고, 지금은 **OpenUI5 1.153.0** 기준이에요.

1. npm에서 라이브러리를 받아 `resources/` 한 폴더에 풀어요.
   ```sh
   for p in sap.m sap.f sap.ui.core sap.ui.layout sap.ui.unified sap.ui.table sap.uxap sap.tnt; do npm pack @openui5/$p@<버전>; done
   mkdir -p srv/resources && for t in *.tgz; do tar xzf $t && cp -r package/src/* srv/resources/ && rm -rf package; done
   ```
2. `extract.html`을 `srv/`에 두고 아무 정적 서버로 열면 `window.RESULT`에 결과가 생겨요. 이걸 `meta.json`으로 저장해요 (Playwright 등).
3. 모듈 경로 목록을 만들어요 (테스트·디자인타임·내부 파일은 빼요).
   ```sh
   cd srv/resources && find sap -name "*.js" | grep -v -E "designtime|thirdparty|/themes/|messagebundle|library-preload|-dbg|/test/|/qunit/|/rules/|/support/|/_|/cldr/|/i18n/|Renderer\.js$|/library\.js$" | sed 's/\.js$//' | sort > mods.txt
   ```
4. `python3 build.py meta.json mods.txt ../../src/lib/ui5meta.json`
