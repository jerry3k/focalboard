# Asana importer

This node app converts an Asana json archive into a Focalboard archive. To use:
1. From the Asana Board Menu (dropdown next to board title), select `Export / Print`, and `JSON`
2. Save it locally, e.g. to `asana.json`
3. Add your Asana Access token to the config.json file located in focalboard/import/asana
4. Run `npm install` from within `focalboard/webapp`
5. Run `npm install` from within `focalboard/import/asana`
6. Run `npx ts-node ./src/AsanaAPI.ts`, this will generate the asana.json file with the info we need.
7. Run `npx ts-node importAsana.ts -i <asana.json> -o archive.focalboard`
8. In Focalboard, click `Settings`, then `Import archive` and select `archive.focalboard`

## Import scope

Currently, the script imports all cards from a single board, including their section (column) membership, names, notes and also comments. [Contribute code](https://mattermost.github.io/focalboard/) to expand this.
