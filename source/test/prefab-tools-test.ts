import { PrefabTools } from '../tools/prefab-tools';

/** Manual / dev tests for PrefabTools */
export class PrefabToolsTest {
    private prefabTools: PrefabTools;

    constructor() {
        this.prefabTools = new PrefabTools();
    }

    async runAllTests() {
        console.log('Starting prefab tools tests...');

        try {
            await this.testGetTools();
            await this.testGetPrefabList();
            await this.testCreatePrefab();
            await this.testInstantiatePrefab();
            await this.testValidatePrefab();

            console.log('All tests finished.');
        } catch (error) {
            console.error('Error during prefab tools tests:', error);
        }
    }

    private async testGetTools() {
        console.log('Test 1: list tools');
        const tools = this.prefabTools.getTools();
        console.log(`Found ${tools.length} tools:`);
        tools.forEach(tool => {
            console.log(`  - ${tool.name}: ${tool.description}`);
        });
        console.log('Test 1 done\n');
    }

    private async testGetPrefabList() {
        console.log('Test 2: list prefabs');
        try {
            const result = await this.prefabTools.execute('get_prefab_list', { folder: 'db://assets' });
            if (result.success) {
                console.log(`Found ${result.data?.length || 0} prefabs`);
                if (result.data && result.data.length > 0) {
                    result.data.slice(0, 3).forEach((prefab: any) => {
                        console.log(`  - ${prefab.name}: ${prefab.path}`);
                    });
                }
            } else {
                console.log('get_prefab_list failed:', result.error);
            }
        } catch (error) {
            console.log('Error listing prefabs:', error);
        }
        console.log('Test 2 done\n');
    }

    private async testCreatePrefab() {
        console.log('Test 3: create prefab (mock args)');
        try {
            const mockArgs = {
                nodeUuid: 'mock-node-uuid',
                savePath: 'db://assets/test',
                prefabName: 'TestPrefab'
            };

            const result = await this.prefabTools.execute('create_prefab', mockArgs);
            console.log('create_prefab result:', result);
        } catch (error) {
            console.log('Error in create_prefab:', error);
        }
        console.log('Test 3 done\n');
    }

    private async testInstantiatePrefab() {
        console.log('Test 3.5: instantiate prefab (mock args)');
        try {
            const mockArgs = {
                prefabPath: 'db://assets/prefabs/TestPrefab.prefab',
                parentUuid: 'canvas-uuid',
                position: { x: 100, y: 200, z: 0 }
            };

            const result = await this.prefabTools.execute('instantiate_prefab', mockArgs);
            console.log('instantiate_prefab result:', result);

            this.testCreateNodeAPIParams();
        } catch (error) {
            console.log('Error in instantiate_prefab:', error);
        }
        console.log('Test 3.5 done\n');
    }

    private testCreateNodeAPIParams() {
        console.log('Testing create-node API parameter shapes...');

        const assetUuid = 'mock-prefab-uuid';

        const basicOptions = {
            assetUuid: assetUuid,
            name: 'TestPrefabInstance'
        };
        console.log('Basic options:', basicOptions);

        const withParentOptions = {
            ...basicOptions,
            parent: 'parent-node-uuid'
        };
        console.log('With parent:', withParentOptions);

        const withPositionOptions = {
            ...basicOptions,
            dump: {
                position: { x: 100, y: 200, z: 0 }
            }
        };
        console.log('With position dump:', withPositionOptions);

        const fullOptions = {
            assetUuid: assetUuid,
            name: 'TestPrefabInstance',
            parent: 'parent-node-uuid',
            dump: {
                position: { x: 100, y: 200, z: 0 }
            },
            keepWorldTransform: false,
            unlinkPrefab: false
        };
        console.log('Full options:', fullOptions);
    }

    private async testValidatePrefab() {
        console.log('Test 4: validate prefab');
        try {
            const result = await this.prefabTools.execute('validate_prefab', {
                prefabPath: 'db://assets/nonexistent.prefab'
            });
            console.log('validate_prefab result:', result);
        } catch (error) {
            console.log('Error in validate_prefab:', error);
        }
        console.log('Test 4 done\n');
    }

    testPrefabDataGeneration() {
        console.log('Testing prefab data generation...');

        const mockNodeData = {
            name: 'TestNode',
            position: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            active: true,
            children: [],
            components: [
                {
                    type: 'cc.UITransform',
                    enabled: true,
                    properties: {
                        _contentSize: { width: 100, height: 100 },
                        _anchorPoint: { x: 0.5, y: 0.5 }
                    }
                }
            ]
        };

        const prefabUuid = this.prefabTools['generateUUID']();
        const prefabData = this.prefabTools['createPrefabData'](mockNodeData, 'TestPrefab', prefabUuid);

        console.log('Generated prefab data:');
        console.log(JSON.stringify(prefabData, null, 2));

        const validationResult = this.prefabTools['validatePrefabFormat'](prefabData);
        console.log('Validation:', validationResult);

        console.log('Prefab data generation test done\n');
    }

    testUUIDGeneration() {
        console.log('Testing UUID generation...');

        const uuids = [];
        for (let i = 0; i < 5; i++) {
            const uuid = this.prefabTools['generateUUID']();
            uuids.push(uuid);
            console.log(`UUID ${i + 1}: ${uuid}`);
        }

        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validUuids = uuids.filter(uuid => uuidPattern.test(uuid));

        console.log(`UUID format check: ${validUuids.length}/${uuids.length} valid`);
        console.log('UUID generation test done\n');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    const test = new PrefabToolsTest();
    test.runAllTests();
    test.testPrefabDataGeneration();
    test.testUUIDGeneration();
}
