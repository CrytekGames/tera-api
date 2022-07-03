# tera-api

API and In-game Shop implementation for the TERA Online retail server (patch 92/100) on Node.js. The API consists of two independent servers running on different ports (for the needs of the [Launcher](https://github.com/justkeepquiet/tera-launcher)/Shop and separately for the needs of the Arbiter server). Built-in admin panel for full control of all functionality and viewing logs. There is also full integration with the Box Server and Steer Server (for setting permissions).

### Requirements

* Node.js v18.1.0
* MySQL Server v5.7.38

### Installation

1. Install latest node.js from https://nodejs.org/.
2. Copy the all tera-api files to any directory (e.g. `c:\tera-api`).
3. Open windows console and go to directory (type `cd c:\tera-api`).
4. Run the `npm install` for install required node modules.
5. Copy or rename the `.env.example` file to `.env`.
6. Configure the parameters in the `.env` file.
7. Import the [database files](share) to your MySQL server.
8. Execute the `node src/app` command, or run the file `tera-api.bat` to start API servers.

If you don't plan to use [tera-client-packer](https://github.com/justkeepquiet/tera-client-packer) to automatically update the client through the launcher, set parameter **API_PORTAL_CLIENT_PATCH_NO_CHECK** to **true** in your `.env` config file.

#### Important!

The account database structure used differs from that used in the leaked retail version of the server. The supported database structure is located in the `share` folder.

### Arbiter API

It is intended for processing internal requests from the Arbiter Server, such as checking a token, receiving events about the character's behavior, etc.
This API must be binded only on a local IP address and must not be accessed by external users!

### Portal API

This API is a web server intended for the Launcher (portal). This API must be available from the outside (proxied by Nginx or binded on external IP) for use by server users: registration, authorization, login, update routines etc.
Also, this API allows to process static elements (directory `public`).
