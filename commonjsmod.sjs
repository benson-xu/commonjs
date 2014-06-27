// Whitebeam CommonJS Implementation

var require = (function() {
  // Private data and functions
	if (!Function.prototype.bind) {
		Function.prototype.bind = function(scope) {
			var _function = this;
			
			return function() {
				return _function.apply(scope, arguments);
			}
		}
	}
  
  // The sole exported function
  function require(modName) {
		var path = (this.id && this.id.replace(/[^\/]*$/,'')) || rb.page.env.Path().replace(/[^\/]*$/,'');
		
    if (modName==null || modName.search(/\S/)<0)
      throw Error('Invalid module name');

    // 'require' doesn't allow extensions but we do. If there is no extension then use 'js'
		if (modName.search(/\.s?js$/)<0)
      modName += '.js';
						
    // Search loaded modules and then fall back to the FS
    var mod = searchLoaded(modName, path) || searchFS(modName, path);
    if (mod==null)
      throw Error("Module: "+modName+" can't be found");

    return mod.exports;
  }
  
	require.paths  = [rb.page.env.Path().replace(/[^\/]*$/,''), rb.page.env.Path().replace(/[^\/]*$/,'')+"node_modules/lib/"];
  var modsLoaded = require.modules = {};

  function searchLoaded(modName, curPath) {
    // Can be absolute, relative or unqualified
    if (modName.charAt(0)=='/') {
      // Absolute path but might still contain '..'
      return modsLoaded[rb.page.abspath(modName)];
    }
    // Otherwise need to check all search paths...
    var mod = modsLoaded[rb.page.abspath(curPath+modName)];
		for (var i=0;mod==null && i<require.paths.length;i++)
      mod = modsLoaded[rb.page.abspath(require.paths[i]+modName)];

    return mod;
  }
	
	// Folders as Modules: support index.js, but not for package.json and index.node
	// Loading from node_modules Folders: recursively look for module at node_modules folders	
	function resolveNodeFS(modName, curPath){
		var fl = new Binary, paths, path, fname, found=false;
		// remove .js or .sjs
		modName = modName.slice(-3)=='.js' ? modName.substr(0, modName.length-3) : modName.substr(0, modName.length-4);
		paths = [curPath];
		paths	= paths.concat(require.paths);
		
		while(!found && paths.length>0) {
			path = paths.shift();
			// Load modules	from a folder
			if (modName.substr(0,2)==='./' || modName.substr(0,3)==='../') {			
				fname = rb.page.abspath(path  + modName + "/"+ "index.js");
				found = fl.open(fname);
			} else {		
				// Find node module by checking node_modules folder
				//while(path=path.split("/").slice(0, -1).join("/")) {
				while((path=path.replace(/\/([^\/]*\/?)$/, '/')) && path !== '/'){
					fname = path + modName + "/index.js";
					found = fl.open(fname);
					if (!found) {
						fname = path + modName + "/" + modName + ".js";
						found = fl.open(fname);
					}
					if (!found) {
						fname = path + "node_modules/" + modName + "/index.js";
						found = fl.open(fname);
					}
					if (!found) {
						fname = path + "node_modules/" + modName + "/" + modName + ".js";
						found = fl.open(fname);
					}
					if (!found) {
						fname = path + "node_modules/" + modName + "/lib/index.js";
						found = fl.open(fname);
					}
					if (!found && JSON!=null) {
						fname = path + "node_modules/" + modName + "/package.json";
						if (fl.load(fname)){
							var tmp = JSON.parse(fl.toString());
							fname = path + "node_modules/" + modName + "/" + tmp.main;
							if (tmp.main.slice(-3)=='.js') {
								found = fl.open(fname);
							} else {						
								fname = fname + "/index.js";
								found = fl.open(fname);
							}
						}
					}
					if (found) break;
				}
			}
		}
		return found ? fname : "";
	}
	
  function searchFS(modName, curPath) {
    // Similar to searching the loaded modules but this time we might need to load it.
    var fl = new Binary, fname, src, thisModule;
    if (modName.charAt(0)=='/') {
      fname = rb.page.abspath(modName);
      if (fl.load(fname))
        src = fl;
    }
    else {
      // Need to search...
			fname = rb.page.abspath(curPath+modName);
			if (fl.load(fname))
          src = fl;					
			for (var i=0;src==null && i<require.paths.length;i++) {
        fname = rb.page.abspath(require.paths[i]+modName);
        if (fl.load(fname))
          src = fl;
      }
    }
		
		// no common file module available, try to resolve nodejs modules
		if (src==null && modName.slice(-3)!=='sjs') {
			fname = resolveNodeFS(modName, curPath);
			if (fl.load(fname))
				src = fl;
		}
		
		if (modsLoaded[fname] != null)
			thisModule = modsLoaded[fname];
    else if (src!=null) {
      // Have the raw source - execute it.
      thisModule = modsLoaded[fname] = {exports:{}, id:fname, uri:fname};
			rb.page.eval('(function(require, exports, module){' + src + '})', fname, 1)(require.bind(thisModule), thisModule.exports, thisModule);
    }
    return thisModule;
  }
  return require;
})();