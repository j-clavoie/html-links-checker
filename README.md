# HTML Links Checker Extension for Visual Studio Code

This is a VSCOde extension for HTML coding.

## Overview
This extension validates URLs in HTML code (A tags).

For the moment, this extension checks:
+ if anchor link is present in the current code;
+ if link relatives from the root is working (link that starts with /. ex.: '/folder/file.html')
+ if link is redirected and what's the new URL (redirected)
+ if link is NOT working (including link that requires authentication)
+ if A tag is empty (no href or href is empty)

The extension can't validate links that:
+ require authentication
+ are emails
+ are relative from the folder location (ex.: '../folder/file.html' OR 'file.html')
+ are FTP
+ point to local file (file://)

## Results
**Results are stored in the "Problems" tab of VSCode.**

## How to use
You can select a part of code in the text editor. Only links in this selection will be checked. If you want to validate all links in the text editor, only have to not select any text.

Trigger the extneion by using CTRL-SHIFT-P and typing "html link checker".
Use the text editor's 'Problems' tab to review errors/warnings and apply appropriate action.

## Configuration instructions
This extension has 2 Properties

### Domain (mandatory)
Single string that represent the local domain name server. It's added before link relatives from root. Must include the protocol and no slash at the end (ex.: http://www.mydomain.com, https://mydomain.com)

### Exluded Domains (optional)
If used, it must be defined in JSON format. It's an array of domain names to not validate. Only include the domaine name without any protocol (ex.: domainname.com)
```JSON
"html-links-checker.excludedDomains": [
  "google.com",
  "yourdomainname.com"
]
```

## TODO
+ Validate relative link from folder:
  + Adding a Extension property to define the full local path to site root folder
  + Create the function that validate if file exists localy (no web requets)
+ internal link:
  + adding multiple local domains instead of only one. Allow to validate the DEV and PROD servers, and indicate if the links is only working on the DEV server.
  + if both local servers not return a good result (status 200), then check if the file exists localy in file system.
  + if not get a status 200 on PROD server, all other ways used to valide the link should be shown to user to take appropriate action on link.
+ validate external links:
  + validate if accessibility components are present (ex.: attribute rel="external", hidden text (external link), etc)
+ validate URL in images
+ check if possible to quickly replace redirected link by the new link
+ adding popups to get username and password for link that requires authentication. Maybe adding Extension's properties to store username and password (insecur).
+ find a way to validate email (if possible)
+ validate FTP link





## License
[MIT](https://choosealicense.com/licenses/mit/)