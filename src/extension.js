const vscode = require('vscode');
const genFunc = require('./genericFunctions');
const urllib = require('urllib'); // https://www.npmjs.com/package/urllib
const JSDOM = require('jsdom').JSDOM;


// Create a new Collection for Diagnostics
// A Diagnostics Collection must be outsides of a function.
const links_checker_diagColl = vscode.languages.createDiagnosticCollection("html-link-checker");
// Clear all diagnostics from the "Problems" Tab when we close the file
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
		// If code is not HTML, then exits with a message, message sent inside the isHTMLcode function.
		if (!genFunc.isHTMLcode()) {
			return;
		}

		// Clear previous Diagnostics
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

/**
 * This is the main funcion that start the validation process
 */
async function main_Validation_Process() {
	// Create a DOM with ALL content (used to valide IDs)
	const tt = genFunc.getWholeText();
	const wholeDOM = new JSDOM(tt, { includeNodeLocations: true, contentType: "text/html" });

	// Get selected text
	const curContent = genFunc.getTextSelected(true);
	// Create a DOM from the selected text
	let myDOM = new JSDOM(curContent, { includeNodeLocations: true, contentType: "text/html" });
	// Retrieve all A tag in the DOM from selected text
	const ATags = myDOM.window.document.querySelectorAll('a');

	// *** Process each A Tag - start ****
	// Array that contains all object URLValidator
	let arrayOfProcesses = [];
	// Manager the number of link validate before to wait.
	let cpt = 0;
	// get Extension's property values for the process
	const nbIteration = vscode.workspace.getConfiguration("html-links-checker").delayNumberOfLinksBeforeWait;
	const nbMilisecond = vscode.workspace.getConfiguration("html-links-checker").delayNumberOfLinksBeforeWait;
	// Loop each A tag
	for (let x = 0; x < ATags.length; x++) {
		if (cpt == nbIteration) {
			await genFunc.waiter(nbMilisecond)
			cpt = 0;
		}
		// Create a new object in the array (object automatically validates the link)
		arrayOfProcesses.push(new URLValidator(ATags[x], wholeDOM));
		cpt++;
	}
	// *** Process each A Tag - end ****

	// This section waits until all links will have been processed
	// object property "completed" is "true" for all links.
	let flagWhile = true;
	while (flagWhile) {
		await genFunc.waiter(800)
		let flagFor = true;
		for (let x = 0; x < ATags.length; x++) {
			if (arrayOfProcesses[x].completed == false) {
				flagFor = false
			}
		}
		if (flagFor) {
			flagWhile = false;
		}
	}
	vscode.window.showInformationMessage("Processus terminé");

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


/**
 * Object that validate an A tag element
 * TODO: change contructor to indicate if the object is an A tag or a IMG tag
 */
class URLValidator {
	/**
	 * 
	 * @param {JSDOM.nodeElem} JSDOM_Link_tag is the tag that contains the URL to check (A or IMG tag)
	 * @param {JSDOM} wholeDOM is the DOM of the whole current active editor.
	 * 												 Must be the whole DOM for the position and for the Anchor validation
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

		// Warning Type properties
		this.warning = {};

		// Variable of control
		let canProcessValidation = true;

		// When URL has been processed, no matter the result, this attribute is set to TRUE
		this.completed = false;

		// Evaluate the URL to determine its kind/preliminary error
		this.processURL();

		// If URL is empty or it's in the excluded list, no validation required
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
			// Validate URL
			this.validateURL();
		} else {
			// Set this object as process completed			
			this.completed = true;
			// Analyze error and add message to 'Problems' tab
			this.addMessage();
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

		if (!this.error.emptyURL) {
			// Check if the URL is excluded (from Extension's properties)
			if (vscode.workspace.getConfiguration("html-links-checker").excludedDomains.length > 0) {
				const excludedDomainsList = vscode.workspace.getConfiguration("html-links-checker").excludedDomains;
				if (excludedDomainsList.length > 0) {
					// Define default flag
					let exclError = false;
					// Keep URL in lowercase to use it in the forEach below
					const tmpURL = this.url.toLowerCase();

					// Check if all excluded domains are present in the URL
					excludedDomainsList.forEach(function (edl) {
						if (tmpURL.search(edl) > -1) {
							// Change flag value
							exclError = true;
						}
					});

					// Flag is true then this URL excluded
					if (exclError) {
						this.urlType.isExcluded = true;
					}
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

		if (this.urlType.isEmail) {
			this.validate_Email();
		}

		if (this.urlType.isRelative) {
			this.validate_Relative();
		}

		if (this.urlType.isLocalFile) {
			this.validate_local_file();
		}

		if (this.urlType.isFTP) {
			this.validate_FTP();
		}

		if (this.urlType.isExternal) {
			// Validate External Link Accessibility
			if (vscode.workspace.getConfiguration("html-links-checker").validateExternalLinkAccessibility) {
				this.validate_External_Link_Accessibility();
			}
			this.validate_full_link();
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
		// Set this object as process completed
		this.completed = true;

		// Analyze error and add message to 'Problems' tab
		this.addMessage();
	}


	validate_External_Link_Accessibility() {
		const stringsToCheck = vscode.workspace.getConfiguration("html-links-checker").externalLinkAccessibilityStringToCheck;
		/*  TODO: This section must be improved to not validate as external link when it local
							URL using the local domain... maybe must be done before in the whole process
		let localDomain = vscode.workspace.getConfiguration("html-links-checker").localDomain;
		localDomain = localDomain.replace(/(http(s?):\/\/)?/, '');
		if (this.domTag.href.search(localDomain) == -1) { }
 		*/
		if (this.domTag.rel != 'external') {
			this.error.ExternalAccessibility = true;
		}
		let strNoPreset = true;

		for (let tmpx = 0; tmpx < stringsToCheck.length; tmpx++) {
			if (this.domTag.text.search(stringsToCheck[tmpx]) > -1) {
				strNoPreset = false;
				tmpx = stringsToCheck.length
			}
		}
		if (strNoPreset) {
			this.error.ExternalAccessibility = true;
		}
	}

	/**
	 * Method that validates Email Address
	 */
	validate_Email() {
		// Regex pattern to use to test email validation ** Get on Stackoverflow.com
		const rePattern = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		// Remove the 'mailto:' part in the URL before test it
		const tmpURL = this.url.replace("mailto:", '');
		// Test the email address, if not OK = add error
		if (!rePattern.test(tmpURL)) {
			this.error.emailInvalid = true;
		}
		// Set this object as process completed
		this.completed = true;

		// Analyze error and add message to 'Problems' tab
		this.addMessage();
	}


	/**
	 * Method that validates relative Link
	 * TODO: Nothing is validated for the moment, only a warning is displayed to user to inform that link is relative
	 */
	validate_Relative() {
		this.warning.relativeFile = true;
		// Set this object as process completed
		this.completed = true;

		// Analyze error and add message to 'Problems' tab
		this.addMessage();
	}

	/**
	 * Method that validates local_file
	 * TODO: Nothing is validated for the moment, only a warning is displayed to user to inform that link is relative
	 */
	validate_local_file() {
		// Set this object as process completed
		this.completed = true;

		// Analyze error and add message to 'Problems' tab
		// this.addMessage();
	}

	/**
	 * Method that validates FTP 
	 * TODO: Nothing is validated for the moment, only a warning is displayed to user to inform that link is relative
	 */
	validate_FTP() {
		// Set this object as process completed
		this.completed = true;

		// Analyze error and add message to 'Problems' tab
		// this.addMessage();
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
			followRedirect: true,
			timeout: 6000/*
			enableProxy: true,
			proxy: '',
			*/
		};
		// Copy the current object in a variable to be able to refer to it inside another object.
		const self = this;

		// Create the full URL
		// If localDomain has been provided then it's a local URL and local domain must be added
		// If not then it's external link and only use the URL in the DOM
		const fullURL = localDomain != null ? localDomain + this.url : this.url;

		// Request the URL with Promise way
		urllib.request(fullURL, options).then(function (result) {
			// Set the statusCode returned by the request
			self.statusCode = result.res.statusCode;
			// If URL have been redirected then analyze differences
			if (result.res.requestUrls.length > 1) {
				//if (result.res.statusCode != 200) {
				//	self.error.requestError = true;
				//}

				// Get initial and final URL without the last / (if present)
				let initialURL = result.res.requestUrls[0].replace(/\/$/g, '');
				let finalURL = result.res.requestUrls[result.res.requestUrls.length - 1].replace(/\/$/g, '');

				// Set warning
				self.warning.redirected = true;
				// Get the new redirected URL
				self.redirectURL = finalURL;

				// Apply regex on initial and final URL for following comparaisons
				initialURL = initialURL.match(/(.*?\:\/\/)(www\.)*(.+?)$/i);
				finalURL = finalURL.match(/(.*?\:\/\/)(www\.)*(.+?)$/i);

				// Check if Protocl (HTTP(S)) has changed from the initial to final URL
				self.warning.redirectProtocolChanged = initialURL[1] == finalURL[1] ? false : true;

				// Check if WWW has been added or removed from the initial to final URL
				self.warning.redirectWWW = initialURL[2] == finalURL[2] ? false : true;
			}
			// Set this object as process completed
			self.completed = true;

			// Analyze error and add message to 'Problems' tab
			self.addMessage();

		}).catch(function (err) {
			switch (err.res.statusCode) {
				case -1:
					self.error.networkError = true;
					break;
				case -2:
					self.error.connectionTimeout = true;
					break;
				default:
					if (err.res.statusCode != 200) {
						self.error.requestError = true;
					}
					break;
			}
			// Set this object as process completed
			self.completed = true;

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
			buildMSG += " => URL contains space(s). Remove spaces and re-execute validation.\n";
		}
		if (this.error.emailInvalid) {
			buildMSG += " => Email address is invalid.\n";
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
		if (this.error.ExternalAccessibility) {
			buildMSG += " => Accessibility, rel=\"external\" or text is missing.\n";
		}
		if (this.error.requestError) {
			switch (this.statusCode) {
				case 401:
					buildMSG += " => Error: Authentication required, code #" + this.statusCode + ".\n";
					break;
				case 404:
					buildMSG += " => Error: Not found, code #" + this.statusCode + ".\n";
					break;
				case 407:
					buildMSG += " => Error: Proxy Authentication Required, code #" + this.statusCode + ".\n";
					break;
				case 410:
					buildMSG += " => Error: Deleted, code #" + this.statusCode + ".\n";
					break;
				case 500 - 599:
					buildMSG += " => Server Error, code #" + this.statusCode + ".\n";
					break;
				default:
					buildMSG += " => Error, code #" + this.statusCode + ".\n";
					break;
			}

		}
		if (this.warning.redirected) {
			buildMSG += " => Redirected to --> " + this.redirectURL + " <--.\n";
		}
		if (this.warning.redirectProtocolChanged) {
			//buildMSG += "	-";
		}
		if (this.warning.redirectWWW) {
			//buildMSG += "	-";
		}
		if (this.warning.relativeFile) {
			buildMSG += " => Relative URL, can't be validated.\n";
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
		// Get if error or warning have been set
		const hasError = Object.keys(this.error).length > 0 ? true : false;
		const hasWarning = Object.keys(this.warning).length > 0 ? true : false;

		// If error has been set then display in 'Problems' tab
		if (hasError || hasWarning) {
			// Define the message error level
			const errorLevel = hasError ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning;
			// Get the message to display
			const msgToShow = this.analyzeErrors();
			// Get the position of the element in the DOM
			const elemRange = genFunc.getDOMelementPosition(this.wholeDOM, this.domTag, true);

			// Define the Diagnostic object
			const diagElem = new vscode.Diagnostic(elemRange, msgToShow, errorLevel);
			diagElem.code = this.statusCode;
			diagElem.source = 'HTML Links Checker';
			// Add the error in the array of diagnostics and display it in the 'Problems' tab
			let myDiagnostics = Array.from(links_checker_diagColl.get(vscode.window.activeTextEditor.document.uri));
			myDiagnostics.push(diagElem);
			links_checker_diagColl.set(vscode.window.activeTextEditor.document.uri, myDiagnostics);
		} else {
			// No error to display... nothing to do for now. Maybe add a Info message.
		}
	}
	// End of the Object: validateURL
}