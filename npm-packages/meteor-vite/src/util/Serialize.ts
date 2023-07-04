import { METEOR_STUB_KEY, PACKAGE_SCOPE_KEY, TEMPLATE_GLOBAL_KEY } from '../vite/StubTemplate';
import { ModuleExport, PackageScopeExports, ParserResult } from '../Parser';


export default new class Serialize {
    
    public moduleExport(module: ModuleExport, packageName: string) {
        if (module.type === 're-export') {
            let from = module.from?.startsWith('.')
                       ? `${packageName}/${module.from?.replace(/^[./]+/, '')}`
                       : module.from;
            
            if (module.name?.trim() === '*' && !module.as) {
                return `export * from '${from}';`
            }
            
            return `export { ${module.name} ${module.as && `as ${module.as} ` || ''}} from '${from}';`
        }
        
        if (module.type === 'export-default') {
            return `export default ${METEOR_STUB_KEY}.default ?? ${METEOR_STUB_KEY};`
        }
        
        if (module.type === 'export') {
            return `export const ${module.name} = ${METEOR_STUB_KEY}.${module.name};`
        }
        
        throw new Error('Tried to format an non-supported module export!');
    }
    
    public packageScopeExport(exportName: string) {
        return `export const ${exportName} = ${PACKAGE_SCOPE_KEY}.${exportName};`;
    }
    
    public packageScopeImport(packageName: string) {
        return `const ${PACKAGE_SCOPE_KEY} = ${TEMPLATE_GLOBAL_KEY}.Package['${packageName}']`;
    }
    
    public parseModules({ packageName, packageScope, modules }: {
        packageName: string;
        packageScope: PackageScopeExports,
        modules: ModuleExport[]
    }) {
        type PlacementGroup = { top: string[], bottom: string[] }
        const result: {
            module: PlacementGroup,
            package: PlacementGroup,
        } = {
            module: {
                top: [],
                bottom: []
            },
            package: {
                top: [],
                bottom: [],
            }
        }
        
        const reservedKeys = new Set<string>();
        
        Object.entries(packageScope).forEach(([name, exports]) => {
            result.package.top.push(this.packageScopeImport(name));
            
            exports.forEach((key) => {
                reservedKeys.add(key);
                result.package.bottom.push(this.packageScopeExport(key))
            });
        });
        
        modules.forEach((module) => {
            if (!module.name) return;
            if (module.type === 'global-binding') return;
            if (reservedKeys.has(module.name)) {
                console.warn('Detected duplicate export keys from module!', {
                    packageName,
                    packageScope,
                    modules
                })
                return;
            }
            
            const line = this.moduleExport(module, packageName);
            
            if (module.type === 're-export') {
                result.module.top.push(line);
            }
            
            if (module.type === 'export') {
                result.module.bottom.push(line);
            }
            
            if (module.type === 'export-default') {
                result.module.bottom.push(line)
            }
        });
        
        
        return result;
    }
    
}

export function getMainModule(result: ParserResult) {
    if (!result.mainModulePath) return;
    const [node_modules, meteor, packageName, ...filePath] = result.mainModulePath.replace(/^\/+/g, '').split('/');
    const moduleKey = filePath.join('/');
    return result.modules[moduleKey];
}

export type SerializedParserResult = {
    packageScope: {
        top: string;
        bottom: string;
    },
    modules: {
        [key in string]: {
            top: string;
            bottom: string;
        }
    }
}

export function getModuleFromPath({ result, importPath }: { result: ParserResult, importPath: string }) {
    const entries = Object.entries(result.modules);
    const file = entries.find(([fileName, modules]) => {
        return importPath.replace(/^\/+/g, '') === fileName.replace(/\.\w{2,5}$/g, '')
    });
    
    if (!file) {
        throw new Error(`Could not locate module for path: ${importPath}!`);
    }
    
    const [fileName, modules] = file;
    
    return { fileName, modules };
}