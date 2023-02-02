import express from "express";
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from "toad-scheduler";

import updateWatchTime from "../controllers/update.js";
import ignoreUser from "../controllers/ignoreUser.js";
import getUser from "../controllers/getUser.js";
import restoreUser from "../controllers/restoreUser.js";
import resetChannel from "../controllers/resetChannel.js";
import { fetchMinimum, fetchTop } from "../controllers/fetchUsers.js";

const app = express();

const scheduler = new ToadScheduler();

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

  switch (req.query["action"]) {
    case "track":
      if (scheduler.existsById(channel)) {
        const existingJob = scheduler.getById(channel);

        if (existingJob.getStatus() === "stopped") {
          existingJob.start();

          return res.status(200).json({
            message: `Watch time tracker for channel ${channel} has been restarted.`,
            jobStatus: existingJob.getStatus(),
          });
        }

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
        { seconds: 15, runImmediately: false },
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
    case "stop":
      if (scheduler.existsById(channel)) {
        scheduler.stopById(channel);

        return res.status(200).json({
          message: `Watch time tracker for channel ${channel} has been stopped.`,
          jobStatus: scheduler.getById(channel).getStatus(),
        });
      } else {
        return res.status(202).json({
          message: `No watch time tracker configured for channel ${channel}. Start tracking first.`,
        });
      }
  }
});

export default app;
