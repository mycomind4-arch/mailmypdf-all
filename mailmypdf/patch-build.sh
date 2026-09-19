#!/usr/bin/env bash
# Post-build patch: fix pdf-lib tslib module loading on Cloudflare Workers
# The bundler's __toESM(__commonJSMin(...)).default chain returns undefined on Workers.
set -euo pipefail
TSLIB_FILE=".output/server/_libs/pdf-lib+tslib.mjs"
if [ ! -f "$TSLIB_FILE" ]; then
  echo "⚠ $TSLIB_FILE not found — skipping patch"
  exit 0
fi
if grep -q "_tslibResult = (function()" "$TSLIB_FILE"; then
  echo "✓ pdf-lib tslib patch already applied"
  exit 0
fi
python3 << 'PYEOF'
content = open(".output/server/_libs/pdf-lib+tslib.mjs").read()

# Replace the broken __toESM(__commonJSMin(...)).default with a direct IIFE
# The original format is:
#   var { __extends, ... } = (/* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
#   ...code...
#   })))())).default;
# Replace with:
#   var _tslibResult = (function() { var exports = {}; var module = { exports: exports }; (function(exports, module) {
#   ...code...
#   })(exports, module); return exports; })();
#   var { __extends, ... } = _tslibResult;

old_begin = 'var { __extends, __assign, __rest, __decorate, __param, __metadata, __awaiter, __generator, __exportStar, __createBinding, __values, __read, __spread, __spreadArrays, __await, __asyncGenerator, __asyncDelegator, __asyncValues, __makeTemplateObject, __importStar, __importDefault, __classPrivateFieldGet, __classPrivateFieldSet } = (/* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {'
new_begin = 'var _tslibResult = (function() { var exports = {}; var module = { exports: exports }; (function(exports, module) {'

if old_begin not in content:
    print("⚠ Could not find tslib destructuring — already patched or structure changed")
    exit(0)

content = content.replace(old_begin, new_begin)

old_end = '})))())).default;\n//#endregion'
new_end = '})(exports, module); return exports; })();\nvar { __extends, __assign, __rest, __decorate, __param, __metadata, __awaiter, __generator, __exportStar, __createBinding, __values, __read, __spread, __spreadArrays, __await, __asyncGenerator, __asyncDelegator, __asyncValues, __makeTemplateObject, __importStar, __importDefault, __classPrivateFieldGet, __classPrivateFieldSet } = _tslibResult;\n//#endregion'

content = content.replace(old_end, new_end)

open(".output/server/_libs/pdf-lib+tslib.mjs", "w").write(content)
print("✅ pdf-lib tslib patch applied")
PYEOF
