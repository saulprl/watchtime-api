import express, { response } from "express";

import fetch from "node-fetch";
import * as dotenv from "dotenv";
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from "toad-scheduler";

import updateWatchTime from "../controllers/update.js";
import ignoreUser from "../controllers/ignoreUser.js";
import getUser from "../controllers/getUser.js";
import restoreUser from "../controllers/restoreUser.js";
import resetChannel from "../controllers/resetChannel.js";
import { fetchMinimum, fetchTop } from "../controllers/fetchUsers.js";

dotenv.config();
const app = express();
const FIREBASE_API = process.env.FIREBASE;

const trackedChannels = [];

const scheduler = new ToadScheduler();

// const task = new Task("test", () => {
//   console.log(`Test running.\nTracked Channels: ${trackedChannels}.`);
// });

// const job = new SimpleIntervalJob({ seconds: 10, runImmediately: true }, task, {
//   id: "1",
// });

// scheduler.addSimpleIntervalJob(job);

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
  // const apiUrl = `${FIREBASE_API}/${channel}.json`;

  // const firebaseAPIRes = await fetch(apiUrl);
  // const jsonRes = await firebaseAPIRes.json();

  // let data;

  // if (jsonRes) {
  //   data = jsonRes;
  // } else {
  //   data = {
  //     lastUpdate: new Date().getTime(),
  //     chatters: {},
  //   };
  // }

  switch (req.query["action"]) {
    case "track":
      if (scheduler.existsById(channel)) {
        return res.status(202).json({
          message: `Watch times for channel ${channel} are already being tracked.`,
        });
      }

      const task = new AsyncTask(
        channel,
        updateWatchTime.bind(null, channel),
        (err) => {
          console.log(err);
        }
      );

      const job = new SimpleIntervalJob(
        { seconds: 15, runImmediately: true },
        task,
        { id: channel }
      );

      scheduler.addSimpleIntervalJob(job);

      return res.status(201).json({
        message: `Added channel ${channel}`,
      });
    case "get":
      const userToGet = req.query["user"].toLowerCase();

      try {
        const { message, seconds } = await getUser(channel, userToGet);

        return res.status(200).json({
          message,
          seconds,
        });
      } catch (error) {
        return res.status(202).json({
          message: error.message,
          error: error,
        });
      }
    case "ignore":
      const userToIgnore = req.query["user"].toLowerCase();

      try {
        await ignoreUser(channel, userToIgnore);

        return res.status(200).json({
          message: `${userToIgnore}'s watchtime is no longer being tracked for channel ${channel}.`,
        });
      } catch (error) {
        return res.status(202).json({
          message: error.message,
          error: error,
        });
      }
    case "restore":
      const userToRestore = req.query["user"].toLowerCase();

      try {
        await restoreUser(channel, userToRestore);

        return res.status(200).json({
          message: `The user ${userToRestore}'s watch time tracker has been restored for channel ${channel}.`,
        });
      } catch (error) {
        return res.status(202).json({
          message: error.message,
          error: error,
        });
      }
    case "reset":
      try {
        await resetChannel(channel);

        return res.status(200).json({
          message: `Watch time records for channel ${channel} have been reset.`,
        });
      } catch (error) {
        return res.status(202).json({
          message: error.message,
          error: error,
        });
      }
    case "fetch":
      if (req.query["min"]) {
        try {
          const minChatters = await fetchMinimum(channel, +req.query["min"]);

          return res.status(200).json({
            message: `Viewers with at least ${req.query["min"]} seconds spent watching ${channel}.`,
            minChatters,
          });
        } catch (error) {
          return res.status(202).json({
            message: error.message,
            error: error,
          });
        }
      }
      if (req.query["top"]) {
        try {
          const { sortedChatters, limit } = await fetchTop(
            channel,
            +req.query["top"]
          );

          return res.status(200).json({
            message: `Top ${limit} watch times for channel ${channel}.`,
            sortedChatters,
          });
        } catch (error) {
          return res.status(202).json({
            message: error.message,
            error: error,
          });
        }
      }
      break;
  }
  /*
  if (/track/i.test(req.query["action"])) {
    // Create task and job for the incoming request.
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
      ...tmiData["staff"],
      ...tmiData["admins"],
      ...tmiData["global_mods"],
    ];

    const timeDiff = Math.floor(
      (new Date().getTime() - data.lastUpdate) / 1000
    );

    if (timeDiff < 2400) {
      for (const viewer of activeViewers) {
        if (!Object.keys(data.chatters).includes(viewer)) {
          data.chatters[viewer] = { watchtime: 0, ignore: false };
        } else if (!data.chatters[viewer]["ignore"]) {
          data.chatters[viewer]["watchtime"] += timeDiff;
        }
      }
      data.lastUpdate += timeDiff * 1000;

      const firebaseRes = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (firebaseRes.ok) {
        return res.status(200).json({
          message: "Watchtimes have been updated.",
          lastUpdate: new Date(data.lastUpdate),
        });
      } else {
        return res.status(202).json({
          message: "There was an error connecting to the API.",
        });
      }
    } else {
      data.lastUpdate += timeDiff * 1000;

      const firebaseRes = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (firebaseRes.ok) {
        return res.status(200).json({
          message: "Set last update, no watchtimes modified.",
          lastUpdate: new Date(data.lastUpdate),
        });
      } else {
        return res.status(202).json({
          messsage: "There was an error connecting to the API.",
        });
      }
    }
  } else if (/get/i.test(req.query["action"])) {
    if (Object.keys(data.chatters).length === 0) {
      return res.status(202).json({
        message:
          "No watchtime records have been found. Might need to update first.",
      });
    }

    if (!req.query["user"]) {
      return res.status(202).json({
        message: "The request must contain a username.",
      });
    }

    const username = req.query["user"].toLowerCase();
    if (!Object.keys(data.chatters).includes(username)) {
      return res.status(202).json({
        message: `There are no watchtime records for ${username}, update first.`,
      });
    }

    if (data.chatters[username].ignore) {
      return res.status(202).json({
        message: `The user ${username} is currently excluded from the watchtime tracker.`,
      });
    }

    let timeDiff = Math.floor((new Date().getTime() - data.lastUpdate) / 1000);
    if (timeDiff > 2400) {
      timeDiff = 0;
    }

    const watchTime = data.chatters[username].watchtime + timeDiff;

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
  } else if (/reset/i.test(req.query["action"])) {
    if (Object.keys(data.chatters).length === 0) {
      return res.status(202).json({
        message: `No watchtime records have been found for channel ${channel}. Might need to update first.`,
      });
    } else {
      for (const viewer in data.chatters) {
        data.chatters[viewer].watchtime = 0;
      }
      data.lastUpdate = new Date().getTime();

      const firebaseRes = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (firebaseRes.ok) {
        return res.status(200).json({
          message: `Watchtimes for channel ${channel} have been reset.`,
          lastUpdate: new Date(data.lastUpdate),
        });
      } else {
        return res.status(202).json({
          message: "There was an error connecting to the API.",
        });
      }
    }
  } else if (/ignore/i.test(req.query["action"])) {
    if (!req.query["user"]) {
      return res.status(400).json({
        message: "The request must contain a username to exclude.",
      });
    }

    const user = req.query["user"].toLowerCase();
    let resMessage = "";

    if (Object.keys(data.chatters).includes(user)) {
      data.chatters[user].ignore = !data.chatters[user].ignore;
      resMessage = data.chatters[user].ignore
        ? `The user ${user} has been excluded from the watchtime tracker for channel ${channel}.`
        : `The user ${user} is no longer omitted for channel ${channel}.`;
    } else {
      data.chatters[user] = { watchtime: 0, ignore: true };
      resMessage = `The user ${user} has been excluded from the watchtime tracker for channel ${channel}.`;
    }

    const firebaseRes = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (firebaseRes.ok) {
      return res.status(201).json({
        message: resMessage,
      });
    } else {
      return res.status(202).json({
        message: "There was an error connecting to the API.",
      });
    }
  } else if (/fetch/i.test(req.query["action"])) {
    if (req.query["min"]) {
      const minSeconds = +req.query["min"];

      if (!Object.keys(data.chatters).length > 0) {
        return res.status(202).json({
          message: `There are no watchtime records for channel ${channel}. Might need to update first.`,
        });
      } else {
        const filteredChatters = [];

        for (const chatter in data.chatters) {
          if (
            data.chatters[chatter].watchtime >= minSeconds &&
            !data.chatters[chatter].ignore
          ) {
            filteredChatters.push({
              name: chatter,
              watchtime: data.chatters[chatter].watchtime,
            });
          }
        }

        return res.status(200).json({
          message: `Users with at least ${minSeconds} seconds of watchtime for channel ${channel}`,
          filteredChatters,
        });
      }
    } else if (req.query["top"]) {
      let limit = +req.query["top"];

      if (!Object.keys(data.chatters).length > 0) {
        return res.status(202).json({
          message: `There are no watchtime records for channel ${channel}. Might need to update first.`,
        });
      } else {
        limit =
          limit > Object.keys(data.chatters).length
            ? Object.keys(data.chatters).length
            : limit;

        const chattersArray = [];
        for (const chatter in data.chatters) {
          if (!data.chatters[chatter].ignore) {
            chattersArray.push({
              name: chatter,
              watchtime: data.chatters[chatter].watchtime,
            });
          }
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
  */
});

export default app;
