"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = __importDefault(require("node-fetch"));
const ws_1 = __importDefault(require("ws"));
const contants_1 = require("../contants");
const guilds_1 = __importDefault(require("../guilds"));

class Sniper {
    constructor() {
        this.opcodes = {
            DISPATCH: 0,
            HEARTBEAT: 0.003,
            IDENTIFY: 2,
            RECONNECT: 7,
            HELLO: 10,
            HEARTBEAT_ACK: 11,
        };
        this.interval = null;
        this.createPayload = (data) => JSON.stringify(data);
        this.heartbeat = () => {
            return this.socket.send(this.createPayload({
                op: this.opcodes.HEARTBEAT,
            }));
        };
        this.socket = new ws_1.default("wss://gateway.discord.gg/?v=10&encoding=json");
        this.socket.on("open", () => {
            console.log("nightcan sniper aktif");
            this.socket.on("message", async (message) => {
                const data = JSON.parse(message);
                if (data.op === this.opcodes.DISPATCH) {
                    if (data.t === "GUILD_UPDATE") {
                        const find = guilds_1.default[data.d.guild_id];
                        console.log(data.d);
                        if (typeof find?.vanity_url_code === 'string' && find.vanity_url_code !== data.d.vanity_url_code) {
                            (0, node_fetch_1.default)(`https://canary.discord.com/api/v10/guilds/${contants_1.SNIPER_GUILD_ID}/vanity-url`, {
                                method: "PATCH",
                                body: this.createPayload({
                                    code: find.vanity_url_code,
                                }),
                                headers: {
                                    Authorization: contants_1.URL_SNIPER_SELF_TOKEN,
                                    "Content-Type": "application/json",
                                },
                            }).then(async (res) => {
                                if (res.ok) {
                                    console.log(`URL BASARIYLA ALINDI / discord.gg/${find.vanity_url_code}`);
                                    process.exit();
                                }
                                else {
                                    const error = await res.json();
                                    console.log(`Error while sniping url: **\`${find.vanity_url_code}\`**.${(error, null, 4)}`);
                                }
                                delete guilds_1.default[data.d.guild_id];
                            }).catch(err => {
                                console.log(err);
                                return delete guilds_1.default[data.d.guild_id];
                            });
                        }
                    }
                    else {
                      if (data.t === "READY") {
                        data.d.guilds
                            .filter((e) => typeof e.vanity_url_code === "string")
                            .forEach((e) => (guilds_1.default[e.id] = { vanity_url_code: e.vanity_url_code }));
                        console.log(`$$SILENT$$ ${Object.keys(guilds_1.default).length} urls to be sniped.
${Object.entries(guilds_1.default)
                            .map(([key, value]) => {
                            return `\`${value.vanity_url_code}\``;
                        })
                            .join(", ")}`);
                    }
                        else if (data.t === "GUILD_CREATE") {
                            guilds_1.default[data.d.id] = { vanity_url_code: data.d.vanity_url_code };
                        }
                        else if (data.t === "GUILD_DELETE") {
                            const find = guilds_1.default[data.d.id];
                            setTimeout(() => {
                                if (typeof find?.vanity_url_code === "string") {
                                    (0, node_fetch_1.default)(`https://discord.com/api/v10/guilds/${contants_1.SNIPER_GUILD_ID}/vanity-url`, {
                                        method: "PATCH",
                                        body: this.createPayload({
                                            code: find.vanity_url_code,
                                        }),
                                        headers: {
                                            Authorization: contants_1.URL_SNIPER_SELF_TOKEN,
                                            "Content-Type": "application/json",
                                        },
                                    }).then(async (res) => {
                                        if (res.ok) {
                                            console.log(`gg ${find.vanity_url_code} nightcan farkı||@everyone||`);
                                            process.exit();
                                        }
                                        else {
                                            const error = await res.json();
                                            console.log(`Error while sniping url: **\`${find.vanity_url_code}\`**.
\`\`\`JSON
${JSON.stringify(error, null, 4)}
\`\`\`
`);
                                        }
                                        delete guilds_1.default[data.d.guild_id];
                                    }).catch(err => {
                                        console.log(err);
                                        return delete guilds_1.default[data.d.guild_id];
                                    });
                                }
                            }, 1);
                        }
                    }
                }
                else if (data.op === this.opcodes.RECONNECT)
                    return process.exit();
                else if (data.op === this.opcodes.HELLO) {
                    clearInterval(this.interval);
                    this.interval = setInterval(() => this.heartbeat(), data.d.heartbeat_interval);
                    this.socket.send(this.createPayload({
                        op: this.opcodes.IDENTIFY,
                        d: {
                            token: contants_1.SNIPER_SELF_TOKEN,
                            intents: 1,
                            properties: {
                                os: "linux",
                                browser: "Firefox",
                                device: "desktop",
                            },
                        },
                    }));
                }
            });
            this.socket.on("close", (reason) => {
                console.log('Websocket connection closed by discord', reason);
                return process.exit();
            });
            this.socket.on("error", (error) => {
                console.log(error);
                process.exit();
            });
        });
    }

    async sendWebhook(url, data) {
      try {
        await axios.post(url, data);
      } catch (error) {
        console.error("Error sending webhook:", error);
      }
  }
  
  
    async sendFailWebhook(vanityUrlCode, guildId) {
      const data = {
        content: "||@everyone||",
        embeds: [
          {
            fields: [
              {
                name: "Failed",
                value: "```" + vanityUrlCode + "```",
              },
            ],
            color: 0,
            footer: {
              text: "developed by nightcan",
            },
          },
        ],
      };
  
      await this.sendWebhook(WEBHOOKS.error, data); // Use the "error" webhook URL
    }
  
    async sendSuccessWebhook(vanityUrlCode, guildId, elapsedSeconds) {
      const data = {
        content: "||@everyone||",
        embeds: [
          {
            title: "Sniped Successfully",
            fields: [
              {
                name: "Vanity URL",
                value: "```" + vanityUrlCode + "```",
                inline: true,
              },
              {
                name: "Accuracy",
                value: "```" + elapsedSeconds + "s```",
                inline: true,
              },
              {
                name: "Speed",
                value: "```bu kısımı yazmaya üşendim ```",
                inline: true,
              },
              {
                name: "Source",
                value: "```siktim attim```",
              },
            ],
            color: 0,
            footer: {
              text: "developed by nightcan",
            },
            image: {
              url: "https://media.tenor.com/R8efzk3qGkkAAAAC/selam-31-ler-cekildimi.gif",
            },
          },
        ],
      };
    
      try {
        await this.sendWebhook(WEBHOOKS.success, data); // Use the "success" webhook URL
      } catch (error) {
        console.error("Error sending success webhook:", error);
      }
    }
    

    async listVanities() {
      // Prepare the data for the webhook
      const data = {
        content: "",
        embeds: [
          {
            title: "List of Vanities",
            description: "Here is the list of vanities currently being tracked:",
            fields: [],
            color: 0,
            footer: {
              text: "developed by nightcan",
            },
          },
        ],
      };
  
      // Get an array of vanity URLs
      const vanityURLs = Object.values(guilds)
        .filter((guildData) => typeof guildData.vanity_url_code === "string")
        .map((guildData) => guildData.vanity_url_code);
  
      // Prepare the list of vanity URLs as a comma-separated string
      const vanityURLString = vanityURLs.join(", ");
  
      // Add the list of vanity URLs to the fields array
      data.embeds[0].fields.push({
        name: "Guild Vanities",
        value: `\`${vanityURLString}\``,
      });
  
      // Add the image URL
      data.embeds[0].image = {
        url: "https://media.tenor.com/R8efzk3qGkkAAAAC/selam-31-ler-cekildimi.gif",
      };
  
      try {
        await this.sendWebhook(WEBHOOKS.info, data); // Use the "info" webhook URL
      } catch (error) {
        console.error("Error while sending vanity list webhook:", error);
      }
    
      try {
        await this.sendWebhook(WEBHOOKS.info, data); // Use the "info" webhook URL
      } catch (error) {
        console.error("Error while sending vanity list webhook:", error);
      }
    }
}
exports.default = Sniper;
