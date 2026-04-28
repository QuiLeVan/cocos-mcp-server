# cocos-mcp-server — current test scripts

> **Status snapshot**: 2026-04-28
> These four files are *manual smoke scripts*, not an automated test suite. There is no `npm test`, no runner, no assertions — pass/fail is judged by reading `console.log` output.

## Files

| File | Runtime | Talks to | Purpose |
|------|---------|----------|---------|
| `manual-test.ts` | Cocos editor process | `Editor.Message.request` (raw editor IPC, *not* the MCP tools) | Hand-checks scene/asset-db/project IPC round-trips |
| `tool-tester.ts` | Cocos editor process | `Editor.Message.request` (raw editor IPC) | Same as above, but collects a `{summary, results, grouped}` report. No assertions — *any non-throwing response counts as pass* |
| `mcp-tool-tester.ts` | Browser/editor with `WebSocket` | `ws://localhost:<port>` | **Broken against current server** — `MCPServer` only serves HTTP JSON-RPC at `/mcp` and REST at `/api/...`; there is no WebSocket endpoint. Treat as legacy/dead code |
| `prefab-tools-test.ts` | Node.js (auto-runs on `require`) | Imports `PrefabTools` directly; some calls hit `Editor.*` and fail outside the editor | Mostly mock-arg probes; pure-logic checks (`testPrefabDataGeneration`, `testUUIDGeneration`) work standalone |

## How to run

### `manual-test.ts` (editor console)

```bash
cd extensions/cocos-mcp-server
npm run build
```

Then in the Cocos Creator DevTools console:

```js
require('/abs/path/extensions/cocos-mcp-server/dist/test/manual-test.js')
MCPTest.runAllTests()
// or: MCPTest.testSceneTools() / testAssetTools() / testProjectTools()
```

The file self-registers on `global.MCPTest` at load time.

### `tool-tester.ts` (editor console)

No global is exposed. After build, from the editor console:

```js
const { ToolTester } = require('/abs/path/.../dist/test/tool-tester.js')
const t = new ToolTester()
await t.runAllTests()        // returns { summary, results, grouped }
```

### `mcp-tool-tester.ts` (legacy WS — currently non-functional)

Would need a WebSocket endpoint added to `mcp-server.ts` before it can connect. Skip until/unless WS is reintroduced.

### `prefab-tools-test.ts` (Node)

```bash
cd extensions/cocos-mcp-server
npm run build
node dist/test/prefab-tools-test.js
```

Auto-runs on `require` via the module-bottom block. Calls hitting `Editor.*` will fail outside the editor (caught and logged); UUID + prefab-data-shape checks pass standalone.

### Manual end-to-end against the running server

Until a real harness exists, the only way to exercise the actual MCP transport is by hand:

```bash
# Project default port: 2999 (settings/mcp-server.json)
curl http://127.0.0.1:2999/health

curl -X POST http://127.0.0.1:2999/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

curl -X POST http://127.0.0.1:2999/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"scene_get_current_scene","arguments":{}}}'
```

## Coverage today

The server ships **14 tool categories**: `scene, node, component, prefab, project, debug, preferences, server, broadcast, sceneAdvanced, sceneView, referenceImage, assetAdvanced, validation`.

| Category | Coverage | Where | Notes |
|---|---|---|---|
| scene | partial | manual-test, tool-tester, mcp-tool-tester | only get-current/list + create/query/remove node; no create/save/open/close scene |
| node | partial | mcp-tool-tester | create/get/delete only; no find/move/duplicate/detect-type/set-property/set-transform/get-all |
| component | minimal | mcp-tool-tester | only `get_available_components` |
| prefab | partial | prefab-tools-test (mocks) | only `get_prefab_list` runs for real; create/instantiate/validate use mock UUIDs and are expected to fail |
| project | minimal | manual-test, mcp-tool-tester | only `query-info` / `can-build` / `get_project_info` |
| debug | minimal | mcp-tool-tester | only `get_editor_info` |
| preferences | **0** | — | untested |
| server | **0** | — | untested |
| broadcast | **0** | — | untested |
| sceneAdvanced | **0** | — | undo, snapshot, copy/paste, scene-script execution all untested |
| sceneView | **0** | — | untested |
| referenceImage | **0** | — | untested |
| assetAdvanced | **0** | — | untested |
| validation | **0** | — | untested |

### Cross-cutting gaps

- **No transport tests.** `/mcp` (JSON-RPC envelope, parse error, method not found, invalid params), `/api/{cat}/{tool}` REST shim, `/health`, max-connections limit — all untested.
- **No tool-manager tests.** Enable/disable, persistence to `settings/tool-manager.json`, the 5-slot limit.
- **No lifecycle tests.** Start/stop, port-in-use, autoStart, settings hot-reload.
- **No negative cases.** Invalid UUIDs, missing required args, schema mismatch, unknown tool/category names.
- **No assertions.** Everything is `console.log`; `tool-tester` treats any non-throwing response as success even if the response is an error envelope.

## Plan to expand

See [`.ai-docs/plans/004-mcp-server-test-coverage.md`](../../../../.ai-docs/plans/004-mcp-server-test-coverage.md).
