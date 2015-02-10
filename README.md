# webfont-list

A missing machine-readable webfont list.

## JSON

- TypeSquare: https://raw.githubusercontent.com/hanamura/webfont-list/master/data/typesquare.json

## Scraping example

Scraping TypeSquare webfont list:

```sh
npm install
npm run get-typesquare --silent -- --email=[typesquare account email] --password=[typesquare account password] > output.json
```
