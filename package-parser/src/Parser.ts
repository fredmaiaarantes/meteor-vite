import { parse } from '@babel/parser';
import {
    CallExpression,
    FunctionExpression,
    Node,
    ObjectExpression,
    ObjectProperty, StringLiteral,
    traverse,
    VariableDeclaration,
} from '@babel/types';

export async function parseModule(options: { fileContent: string | Promise<string> }) {
    const startTime = Date.now();
    const result = await parseSource(await options.fileContent);
    
    console.log({
        result,
        timeSpent: `${Date.now() - startTime}ms`
    });
    
    return result;
}

function parseSource(code: string) {
    return new Promise<ParserResult>((resolve, reject) => {
        const startTime = Date.now();
        const source = parse(code);
        let completed = false;
        
        traverse(source, {
            enter(node) {
                if (node.type !== 'CallExpression') {
                    return;
                }
                
                if (typeof node.callee !== 'object') {
                    return;
                }
                
                // @ts-ignore
                if (node.callee.name !== 'meteorInstall') {
                    return;
                }
                
                resolve(parseMeteorInstall(node));
                completed = true;
            }
        });
        
        if (!completed) {
            reject(new Error('Unable to parse Meteor package!'))
        }
    })
}

function parseMeteorInstall(node: CallExpression) {
    const packageConfig = node.arguments[0] as PackageConfig;
    const node_modules = packageConfig.properties[0];
    const meteor = node_modules.value.properties[0];
    const packageName = meteor.value.properties[0];
    const modules = packageName.value.properties;
    const fileNames = modules.map((module) => module.key.value);

    const moduleBody = modules[0].value.body;

    modules.forEach((module) => {
        const fileName = module.key.value;
        module.value.body.body.forEach((node) => {
            const exports = readModuleExports(node);
            if (!exports) {
                return;
            }

            console.log({ [`module.export() // ${fileName.toString()}`]: exports })
        });
    })

    moduleBody.body.forEach((node) => readModuleExports(node));

    return {
        fileNames,
        packageName: packageName.key.value,
    };
}

function readModuleExports(node: Node) {
    if (node.type !== 'ExpressionStatement') return;
    if (node.expression.type !== 'CallExpression') return;
    const { callee, arguments: args } = node.expression;
    if (callee.type !== 'MemberExpression') return;
    if (callee.object.type !== 'Identifier') return;

    // Meteor's module declaration object. `module.`
    if (callee.object.name !== 'module') return;

    // Meteor's module declaration method. `export()`
    if (callee.property.type !== 'Identifier') return;
    if (callee.property.name !== 'export') return;

    return args
}

type ParserResult = ReturnType<typeof parseMeteorInstall>;


type KnownObjectProperty<TValue extends Pick<ObjectProperty, 'key' | 'value'>> = Omit<ObjectProperty, 'key' | 'value'> & TValue;
type KnownObjectExpression<TValue extends Pick<ObjectExpression, 'properties'>> = Omit<ObjectExpression, 'properties'> & TValue;

type PackageConfig = KnownObjectExpression<{
    properties: [KnownObjectProperty<{
        key: StringLiteral & { value: 'node_modules' }
        value: KnownObjectExpression<{
            properties: [KnownObjectProperty<{
                key: StringLiteral & { value: 'meteor' },
                value: KnownObjectExpression<{
                    properties: [KnownObjectProperty<{
                        key: StringLiteral, // Package name
                        value: KnownObjectExpression<{
                            properties: Array<KnownObjectProperty<{
                                key: StringLiteral, // File name
                                value: FunctionExpression, // Module function
                            }>>
                        }>
                    }>]
                }>
            }>]
        }>
    }>]
}>