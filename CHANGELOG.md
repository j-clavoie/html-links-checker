# Change Log

## [Unreleased]

## [1.0.0] - 2020-12-23
Initial version of extension is able to validate:
+ anchor
+ internal link relative from root (start with /)
+ full link

Returns an error for:
+ link that requires authentication
+ link relative from current root ('../folder/file.html' or 'file.html')
+ link not working (no domain name or status 404)
+ link redirected (provide new URL)
+ Empty A tag (no href or href is empty)

No validate:
+ email address
+ FTP link
+ local file link (FILE://)

## previous [1.0.0]
- Was development and testing. No version before 1.0.0 should be used.
