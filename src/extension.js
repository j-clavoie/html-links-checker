const vscode = require('vscode');
const genFunc = require('./genericFunctions');
const urllib = require('urllib'); // https://www.npmjs.com/package/urllib
const JSDOM = require('jsdom').JSDOM;


// Create a new Collection for Diagnostics
// A Diagnostics Collection must be outsides of an function.
const links_checker_diagColl = vscode.languages.createDiagnosticCollection("html-link-checker");

// Use to clear the "Problems" Tab when we close the file
vscode.workspace.onDidCloseTextDocument(function (listener) {
	// clear all previous diagnostics of the closed editor
	links_checker_diagColl.delete(listener.uri);
	links_checker_diagColl.set(listener.uri, undefined);
});


/** ***********************************************************************************************
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	let disposable = vscode.commands.registerCommand('html-links-checker.start', function () {
		links_checker_diagColl.set(vscode.window.activeTextEditor.document.uri, []);
		// Main process - Validate all URL 
		main_Validation_Process();
	});


	// add main function to context array
	context.subscriptions.push(disposable);
}
exports.activate = activate;

function deactivate() { }

module.exports = {
	activate,
	deactivate
}

function main_Validation_Process() {
	// Get selected text
	const curContent = genFunc.getTextSelected(true);
	// Create a DOM from the selected text
	let myDOM = new JSDOM(curContent, { includeNodeLocations: true, contentType: "text/html" });

	// Create a DOM with ALL content (used to valide IDs)
	const tt = genFunc.getWholeText();
	const wholeDOM = new JSDOM(tt, { includeNodeLocations: true, contentType: "text/html" });
	// Retrieve all A tag in the DOM
	const ATags = myDOM.window.document.querySelectorAll('a');

	ATags.forEach(function (elem) {
		//const test = new validateURL(elem, wholeDOM);
		new validateURL(elem, wholeDOM);
	});
}

/* #*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*
/* #*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*
/* #*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*
/* #*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*
/* #*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*
/* #*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*
/* #*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*
/* #*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*#*
*/



class validateURL {
	/**
	 * 
	 * @param {JSDOM.nodeElem} JSDOM_Link_tag 
	 */
	constructor(JSDOM_Link_tag, wholeDOM) {
		this.wholeDOM = wholeDOM;
		this.domTag = JSDOM_Link_tag;
		this.url = this.domTag.getAttribute('href');
		this.text = this.domTag.text;

		// URL Types properties
		this.urlType = {};

		// Error Type properties
		this.error = {};

		// Variable of control
		let canProcessValidation = true;

		// Evaluate the URL to determine its kind/preliminary error
		this.processURL();

		// If URL is empty or it's in the excluded list
		if (this.error.emptyURL || this.urlType.isExcluded) {
			canProcessValidation = false;
		}
		// If URL contains spaces then not process it
		else if (this.url.match(/\s/gi) != null) {
			this.error.spaceInURL = true;
			canProcessValidation = false;
		}

		// If "canProcessValidation"
		if (canProcessValidation) {
			this.validateURL();
		}
	}


	/**
	 * This method determine the URL's kind and find some potential initial error
	 */
	processURL() {
		// Check if the name of link is empty (ex.: <a href="http://domain.com"></a>)
		if (this.domTag.innerHTML.trim().length == 0) {
			this.error.nameless = true;
		}

		// Check if the A tag has no URL
		if (this.url == null || this.url.trim().length == 0) {
			this.error.emptyURL = true;
			// exit because all other tests use the URL and no URL exist
			return;
		}

		// Check if the link is an anchor in the same content (start with #)
		if (this.url.match(/^#/g) != null) {
			this.urlType.isAnchor = true;
		}

		// Check if the URL is an email
		if (this.url.match(/^\s*mailto\:/gmi) != null) {
			this.urlType.isEmail = true;
		}

		// Check if the URL is an FTP link
		if (this.url.match(/^\s*ftp\:/gmi) != null) {
			this.urlType.isFTP = true;
		}

		// Check if the URL is a local file link (file://)
		if (this.url.match(/^\s*file\:/gmi) != null) {
			this.urlType.isLocalFile = true;
		}

		// Check if the URL is excluded (from Extension's properties)
		if (vscode.workspace.getConfiguration("html-links-checker").excludedDomains.length > 0) {
			const excludedDomainsList = vscode.workspace.getConfiguration("html-links-checker").excludedDomains;
			if (excludedDomainsList.length > 0) {
				let exclError = false;
				excludedDomainsList.forEach(function (edl) {
					if (this.url.search(edl) > -1) {
						exclError = true;
					}
				});
				if (exclError) {
					this.urlType.isExcluded = true;
				}
			}
		}

		// Check if the link is relative internal (start with /)
		if (this.url.match(/^(\/{1})/g) != null) {
			this.urlType.isInternal = true;
		}

		// Check if the link is relative from the current folder
		//(start with .. or nothing and ends with web file extension: html, htm, asp, php, txt)
		// TODO: Add an extension property to define file extensions
		if (this.url.match(/(^\.(\.)?\/)|^(?!\w*\:)(\w*\.(html|htm|asp|php|txt)){1}\?*/gi) != null) {
			this.urlType.isRelative = true;
		}

		// If no other Type have been selected then the link is External or
		// internal with protocol and full path 
		if (!(this.urlType.isAnchor || this.urlType.isEmail || this.urlType.isEmpty || this.urlType.isExcluded ||
			this.urlType.isFTP || this.urlType.isInternal || this.urlType.isLocalFile || this.urlType.isRelative)) {
			this.urlType.isExternal = true;
		}
	}



	/**
	 * Main method validates each type of URL
	 */
	validateURL() {
		if (this.urlType.isAnchor) {
			this.validate_Anchor();
		}

		if (this.urlType.isExternal) {
			this.validate_full_link();
			// this.validate_accessibility();
		}

		if (this.urlType.isInternal) {
			this.validate_full_link(vscode.workspace.getConfiguration("html-links-checker").localDomain);
		}
	}

	/**
	 * Method that validates Anchor URL
	 * Check in the whole DOM (in activeTextEditor) to find the ID of the anchor
	 * If no ID or many IDs found, then error is set accordingly
	 */
	validate_Anchor() {
		const anchorLink = this.url.replace(/^#/g, '');
		const anchor = this.wholeDOM.window.document.querySelectorAll("[id='" + anchorLink + "']");
		if (anchor.length == 0) {
			this.error.noAnchor = true;
		} else if (anchor.length > 1) {
			this.error.multipleAnchors = true;
		}

		// Analyze error and add message to 'Problems' tab
		this.addMessage();
	}

	/**
	 * Method that validates an external and internal link.
	 * @param {String} localDomain (optional) is the local domain to add at the beginning of the URL to create a full URL.
	 * If no value passed then the method use the URL in the object.
	 * All errors/warnings found with this URL will be set in the object
	 */
	validate_full_link(localDomain = null) {
		// Define needle's option
		const options = {
			method: vscode.workspace.getConfiguration("html-links-checker").requestMethod,
			rejectUnauthorized: false,
			followRedirect: true
			//timeout: 6000
		};
		// Copy the current object in a variable to be able to refer to it inside another object.
		const self = this;

		// Create the full URL
		// If localDomain has been provided then it's a local URL and local domain must be added
		// If not then it's external link and only use the URL in the DOM
		const fullURL = localDomain != null ? localDomain + this.url : this.url;

		// Request the URL
		urllib.request(fullURL, options, function (err, data, resp) {
			// Set the statusCode returned by the request
			self.statusCode = resp.statusCode;

			// If error
			if (err || resp.statusCode != 200) {
				switch (resp.statusCode) {
					case -1:
						self.error.networkError = true;
						break;
					case -2:
						self.error.connectionTimeout = true;
						break;
					default:
						self.error.requestError = true;
						break;
				}
			} else {
				// If URL have been redirected then analyze differences
				if (resp.requestUrls.length > 1) {

					// Get initial and final URL without the last / (if present)
					let initialURL = resp.requestUrls[0].replace(/\/$/g, '');
					let finalURL = resp.requestUrls[resp.requestUrls.length - 1].replace(/\/$/g, '');

					// Set error
					self.error.redirected = true;
					// Get the new redirected URL
					self.redirectURL = finalURL;

					// Apply regex on initial and final URL for following comparaisons
					initialURL = initialURL.match(/(.*?\:\/\/)(www\.)*(.+?)$/i);
					finalURL = finalURL.match(/(.*?\:\/\/)(www\.)*(.+?)$/i);

					// Check if Protocl (HTTP(S)) has changed from the initial to final URL
					self.error.redirectProtocolChanged = initialURL[1] == finalURL[1] ? false : true;

					// Check if WWW has been added or removed from the initial to final URL
					self.error.redirectWWW = initialURL[2] == finalURL[2] ? false : true;
				}
			}
			// Analyze error and add message to 'Problems' tab
			self.addMessage();
		});
	}



	/**
	 * Method that checks if object contains errors and prepare the message to display to user
	 * If the object has no errors, this method won't do anything
	 * Return a text with all error for this URL
	 */
	analyzeErrors() {
		let buildMSG = '';

		if (this.error.emptyURL) {
			buildMSG += " => No URL.\n";
		}
		if (this.error.spaceInURL) {
			buildMSG += " => URL contains space(s).\n";
		}

		if (this.error.nameless) {
			buildMSG += " => Text link is missing.\n";
		}
		if (this.error.noAnchor) {
			buildMSG += " => the ID where link points doesn't exist.\n";
		}
		if (this.error.multipleAnchors) {
			buildMSG += " => ID where link points is not unique (more than one).\n";
		}
		if (this.error.networkError) {
			buildMSG += " => This link doesn't work/not exist.\n";
		}
		if (this.error.connectionTimeout) {
			buildMSG += " => Connection timeout.\n";
		}
		if (this.error.requestError) {
			switch(this.statusCode){
				case 401:
					buildMSG += " => Error: Authentication required, code #" + this.statusCode + ".\n";
					break;
				case 404:
					buildMSG += " => Error: Not found, code #" + this.statusCode + ".\n";
					break;
				case 410:
					buildMSG += " => Error: Deleted, code #" + this.statusCode + ".\n";
					break;
				case 500-599:
					buildMSG += " => Server Error, code #" + this.statusCode + ".\n";
					break;
				default: 
					buildMSG += " => Error, code #" + this.statusCode + ".\n";
					break;
			}
			
		}
		if (this.error.redirected) {
			buildMSG += " => Redirected to --> " + this.redirectURL + " <--.\n";
		}
		if (this.error.redirectProtocolChanged) {
			//buildMSG += "	-";
		}
		if (this.error.redirectWWW) {
			//buildMSG += "	-";
		}

		if (buildMSG == '') {
			return '';
		} else {
			buildMSG = buildMSG.replace(/\n$/gi, '');
			return 'LINK: ' + buildMSG;
		}
	}



	/**
	 * Method that adds a message in the 'Problems' tab in VSCode.
	 * @param {String} msgToShow is the message that will be displayed to user
	 */
	addMessage() {
		// If error has been set then display in 'Problems' tab
		if (Object.keys(this.error).length > 0) {
			// Get the message to display
			let msgToShow = this.analyzeErrors();
			// Get the position of the element in the DOM
			const elemRange = genFunc.getDOMelementPosition(this.wholeDOM, this.domTag, true);
			// Define the Diagnostic object
			const diagElem = new vscode.Diagnostic(elemRange, msgToShow, vscode.DiagnosticSeverity.Error);
			// Add the error in the array of diagnostics and display it in the 'Problems' tab
			let myDiagnostics = Array.from(links_checker_diagColl.get(vscode.window.activeTextEditor.document.uri));
			myDiagnostics.push(diagElem);
			links_checker_diagColl.set(vscode.window.activeTextEditor.document.uri, myDiagnostics);
		} else {
			// No error to dispaly... nothing to do for now. Maybe add a Info message.
		}
	}
	// End of the Object: validateURL
}