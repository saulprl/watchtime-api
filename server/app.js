import path from "path";
import * as fs from "fs";
import express from "express";
import fetch from "node-fetch";

const app = express();

app.use(express.json());

app.get("/", async (req, res, next) => {
  if (!req.query["action"]) {
    return res.status(400).json({
      message: "The request must contain an action query parameter.",
    });
  }

  if (!req.query["channel"]) {
    return res.status(400).json({
      message: "The request must contain a channel name.",
    });
  }

  const channel = req.query["channel"].toLowerCase();
  const fileName = `${channel}.watchtime.json`;
  const filePath = path.join(process.cwd(), "json", fileName);
  let data;

  if (fs.existsSync(filePath)) {
    data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } else {
    data = {
      lastUpdate: new Date().getTime(),
      chatters: {},
      ignoreUsers: [],
    };
  }

  if (/update/i.test(req.query["action"])) {
    const tmiUrl = `http://tmi.twitch.tv/group/user/${channel}/chatters`;
    const response = await fetch(tmiUrl);

    if (!response.ok) {
      return res.status(response.status).json({
        message: "TMI returned an error.",
      });
    }

    const tmiData = (await response.json())["chatters"];

    const activeViewers = [
      ...tmiData["broadcaster"],
      ...tmiData["vips"],
      ...tmiData["moderators"],
      ...tmiData["viewers"],
    ];

    const timeDiff = Math.floor(
      (new Date().getTime() - data.lastUpdate) / 1000
    );

    if (timeDiff < 600) {
      for (const viewer of activeViewers) {
        if (!Object.keys(data.chatters).includes(viewer)) {
          data.chatters[viewer] = 0;
        } else {
          data.chatters[viewer] += timeDiff;
        }
      }
      data.lastUpdate += timeDiff * 1000;

      fs.writeFileSync(filePath, JSON.stringify(data), {
        encoding: "utf8",
      });

      return res.status(200).json({
        message: "Watchtimes have been updated.",
        lastUpdate: new Date(data.lastUpdate),
      });
    } else {
      data.lastUpdate += timeDiff * 1000;

      fs.writeFileSync(filePath, JSON.stringify(data), {
        encoding: "utf8",
      });

      return res.status(200).json({
        message: "Set last update, no watchtimes modified.",
        lastUpdate: new Date(data.lastUpdate),
      });
    }
  } else if (/get/i.test(req.query["action"])) {
    if (Object.keys(data.chatters).length === 0) {
      return res.status(404).json({
        message: "No watchtime records have been found. Update first.",
      });
    }

    if (!req.query["user"]) {
      return res.status(400).json({
        message: "The request must contain a username.",
      });
    }

    const username = req.query["user"].toLowerCase();
    if (!Object.keys(data.chatters).includes(username)) {
      if (data["ignoreUsers"].includes(username)) {
        return res.status(404).json({
          message: `The user ${username} is currently excluded from the watchtime tracker.`,
        });
      }
      return res.status(404).json({
        message: `There are no watchtime records for ${username}, update first.`,
      });
    } else {
      let timeDiff = Math.floor(
        (new Date().getTime() - data.lastUpdate) / 1000
      );

      if (timeDiff > 600) {
        timeDiff = 0;
      }

      const watchTime = data.chatters[username] + timeDiff;

      let seconds = watchTime;
      let minutes = Math.floor(seconds / 60);
      seconds -= minutes * 60;
      let hours = Math.floor(minutes / 60);
      minutes -= hours * 60;
      let days = Math.floor(hours / 24);
      hours -= days * 24;
      let months = Math.floor(days / 30.437);
      days -= Math.floor(months * 30.437);

      let responseMessage = `${username} has spent `;
      if (months > 0) {
        responseMessage += `${months} months, `;
      }
      if (days > 0) {
        responseMessage += `${days} days, `;
      }
      if (hours > 0) {
        responseMessage += `${hours} hours, `;
      }
      if (minutes > 0) {
        responseMessage += `${minutes} minutes, `;
      }
      responseMessage += `${seconds} seconds watching ${channel} WICKED`;

      return res.status(200).json({
        message: responseMessage,
        seconds: watchTime,
      });
    }
  } else if (/reset/i.test(req.query["action"])) {
    if (Object.keys(data.chatters).length === 0) {
      return res.status(404).json({
        message: `No watchtime records have been found for channel ${channel}. Update first.`,
      });
    } else {
      for (const viewer in data.chatters) {
        data.chatters[viewer] = 0;
      }
      data.lastUpdate = new Date().getTime();

      fs.writeFileSync(filePath, JSON.stringify(data), { encoding: "utf8" });

      return res.status(200).json({
        message: `Watchtimes for channel ${channel} have been reset.`,
        lastUpdate: new Date(data.lastUpdate),
      });
    }
  } else if (/ignore/i.test(req.query["action"])) {
    if (!req.query["user"]) {
      return res.status(400).json({
        message: "The request must contain a username to exclude.",
      });
    }

    const user = req.query["user"].toLowerCase();
    const channel = req.query["channel"].toLowerCase();

    if (!data["ignoreUsers"].includes(user)) {
      data["ignoreUsers"].push(user);

      if (Object.keys(data.chatters).includes(user)) {
        delete data.chatters[user];
      }

      fs.writeFileSync(filePath, JSON.stringify(data), { encoding: "utf8" });

      return res.status(201).json({
        message: `The user ${user} has been excluded from the watchtime tracker for channel ${channel}.`,
      });
    } else {
      data["ignoreUsers"] = data["ignoreUsers"].filter((usr) => usr !== user);
      data["chatters"][user] = 0;

      fs.writeFileSync(filePath, JSON.stringify(data), { encoding: "utf8" });

      return res.status(202).json({
        message: `The user ${user} has been restored for channel ${channel}.`,
      });
    }
  } else if (/fetch/i.test(req.query["action"])) {
    if (req.query["min"]) {
      const minSeconds = +req.query["min"];

      if (!Object.keys(data.chatters).length > 0) {
        return res.status(404).json({
          message: `There are no watchtime records for channel ${channel}. Update first.`,
        });
      } else {
        const filteredChatters = [];

        for (const chatter in data.chatters) {
          if (data.chatters[chatter] >= minSeconds) {
            filteredChatters.push({
              name: chatter,
              watchtime: data.chatters[chatter],
            });
          }
        }

        return res.status(200).json({
          message: `Users with at least ${minSeconds} seconds of watchtime for channel ${channel}`,
          filteredChatters,
        });
      }
    } else if (req.query["top"]) {
      const limit = +req.query["top"];

      if (!Object.keys(data.chatters).length > 0) {
        return res.status(404).json({
          message: `There are no watchtime records for channel ${channel}. Update first.`,
        });
      } else {
        const chattersArray = [];
        for (const chatter in data.chatters) {
          chattersArray.push({
            name: chatter,
            watchtime: data.chatters[chatter],
          });
        }

        const sortedChatters = chattersArray
          .sort((a, b) => -a.watchtime + b.watchtime)
          .slice(0, limit);

        return res.status(200).json({
          message: `Top 5 watchtimes for channel ${channel}.`,
          sortedChatters,
        });
      }
    }

    return res.status(400).json({
      message: "The request must contain a min or top parameter.",
    });
  }
});

app.post("/", (req, res, next) => {
  if (!req.query["channel"]) {
    return res.status(400).json({
      message: "The request must contain a channel name.",
    });
  }
});

export default app;
