# HTML Links Checker Extension for Visual Studio Code

This is a Visual Studio Code extension for HTML coding.

## Overview
This extension validates URLs inside HTML code (A tags) of the Active Editor.

For the moment, this extension checks:
+ if anchor link is present in the current code;
+ if root relative link is working (link that starts with ```/``` like ```/folder/file.html```)
+ if link is redirected and what's the new URL (redirection)
+ if link is NOT working (including links that require authentication)
+ if A tag is empty (no href or empty href)
+ if A tag has no text (ex.: ```<a href="abc.com"></a>```)
+ if accessibility requirements are set for external link.

The extension can't validate links that:
+ require authentication
+ are emails
+ are relative from the folder location (ex.: ```../folder/file.html``` OR ```file.html```)
+ are FTP
+ point to local file (```file://```)

## How to use
The extension uses the selected text or the whole content (if no selection).

Trigger the extension by using <kbd>CTRL</kbd>+<kbd>SHIFT</kbd>+<kbd>P</kbd> and typing "html link checker".
Use the Visual Studio Code's **Problems tab** to review errors/warnings and apply appropriate action.

When an error/warning is fixed, the extension must be re-run to remove the link from the Probloms tab. 


## Configuration instructions
Following are options with descriptions and instructions

### Request Method
Select the method used to send the request to the URL.

Available options are: **"head"**, "get" or "post.


### Local Domain (mandatory)
Single string that represent the local domain name server. It's added before root relative links. Must include the protocol and no slash at the end (ex.: ```http://www.mydomain.com```, ```https://mydomain.com```)


### Exluded Domains (optional)
If used, it must be defined in JSON format. It's an array of domain names to not validate. Only include the domaine name without any protocol (ex.: domainname.com)
```JSON
"html-links-checker.excludedDomains": [
  "google.com",
  "yourdomainname.com"
]
```


### Validate External Link Accessibility
Boolean value to indicate if the accessibility for external link should processed.
Default value: True


### External Link Text
Array of string.
Link accessibility suggests to add term in link's name to precise that the link is an external link. The users can know that they will quit the site to go somewhere else.
Usualy, in english we add "external link" (hidden or not)
Default value: 
  - external link
  - lien externe

To add/remove/modify list you must set it in settings directly in JSON
```JSON
"html-links-checker.externalLinkText": {
  "description": "Specifies string that should be included in external link text to be accessible",
  "type": "array",
  "default": [
    "external link",
    "lien externe"
  ]
}
```

### Show Protocol Redirection Warning
Define how to manage redirection caused only by protocol change (ex.: ```http://``` to ```https://```).
Available Options:
  + "yes - separate" : A warning will be added no matter if another error occur for the same link
  + "Yes - global" : A warning will be added only if no other error are related to this link
  + "No" : No warning will be added for this kind of redirection.


### Show WWW Redirection Warning
Define how to mange redirection caused only by WWW change (if WWW has been added or removed from the initial URL).
  + "yes - separate" : A warning will be added no matter if another error occur for the same link
  + "Yes - global" : A warning will be added only if no other error are related to this link
  + "No" : No warning will be added for this kind of redirection.


## TODO
+ Validate relative link from folder:
  + Adding a Extension property to define the full local path to site root folder
  + Create the function that validate if file exists localy (no web requets)
+ internal link:
  + adding multiple local domains instead of only one. Allow to validate the DEV and PROD servers, and indicate if the links is only working on the DEV server.
  + if both local servers not return a good result (status 200), then check if the file exists localy in file system.
  + if not get a status 200 on PROD server, all other ways used to valide the link should be shown to user to take appropriate action on link.
+ validate URL in images
+ check if possible to quickly replace redirected link by the new link
+ adding popups to get username and password for link that requires authentication. Maybe adding Extension's properties to store username and password (insecur).
+ find a way to validate email (if possible)
+ validate FTP link


## License
[MIT](https://choosealicense.com/licenses/mit/)