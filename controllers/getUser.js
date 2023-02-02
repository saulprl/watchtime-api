import fetch from "node-fetch";
import * as dotenv from "dotenv";

dotenv.config();

const FIREBASE_API = process.env.FIREBASE;

const getUser = async (channel, user) => {
  const apiUrl = `${FIREBASE_API}/${channel}.json`;

  const firebaseChatters = await fetch(apiUrl);

  if (!firebaseChatters.ok) {
    throw new Error("There was an error while connecting to Firebase.");
  }

  const jsonChatters = (await firebaseChatters.json())["chatters"];

  if (!jsonChatters) {
    throw new Error(
      `There are no watch time records for channel ${channel}. Start tracking first.`
    );
  }

  const watchTime = jsonChatters[user]["watchtime"];

  let seconds = +watchTime;
  let minutes = Math.floor(seconds / 60);
  seconds -= minutes * 60;
  let hours = Math.floor(minutes / 60);
  minutes -= hours * 60;
  let days = Math.floor(hours / 24);
  hours -= days * 24;
  let months = Math.floor(days / 30.437);
  days -= Math.floor(months * 30.437);

  let responseMessage = `${user} has spent `;
  if (months > 0) responseMessage += `${months} months, `;
  if (days > 0) responseMessage += `${days} days, `;
  if (hours > 0) responseMessage += `${hours} hours, `;
  if (minutes > 0) responseMessage += `${minutes} minutes, `;
  responseMessage += `${seconds} seconds watching ${channel} WICKED`;

  return {
    message: responseMessage,
    seconds: +watchTime,
  };
};

export default getUser;
