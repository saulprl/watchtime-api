import fetch from "node-fetch";
import * as dotenv from "dotenv";

dotenv.config();

const FIREBASE_API = process.env.FIREBASE;

export const fetchTop = async (channel, value) => {
  const apiUrl = `${FIREBASE_API}/${channel}.json`;

  const firebaseChatters = await fetch(apiUrl);

  if (!firebaseChatters.ok) {
    throw new Error("There was an error while retrieving data.");
  }

  const jsonChatters = await firebaseChatters.json();

  if (!jsonChatters) {
    throw new Error(
      `Unable to find watch time records for channel ${channel}. Start tracking first.`
    );
  }

  const limit = Math.min(value, Object.keys(jsonChatters["chatters"]).length);

  const chattersArray = [];
  for (const chatter in jsonChatters["chatters"]) {
    if (!jsonChatters["chatters"][chatter].ignore) {
      chattersArray.push({
        name: chatter,
        watchtime: +jsonChatters["chatters"][chatter].watchtime,
      });
    }
  }

  const sortedChatters = chattersArray
    .sort((a, b) => -a.watchtime + b.watchtime)
    .slice(0, limit);

  return { sortedChatters, limit };
};

export const fetchMinimum = async (channel, value) => {
  const apiUrl = `${FIREBASE_API}/${channel}.json`;

  const firebaseChatters = await fetch(apiUrl);

  if (!firebaseChatters.ok) {
    throw new Error("There was an error while retrieving data.");
  }

  const jsonChatters = await firebaseChatters.json();

  if (!jsonChatters) {
    throw new Error(
      `Unable to find watch time records for channel ${channel}. Start tracking first.`
    );
  }

  const minSeconds = +value;

  const chattersArray = [];
  for (const chatter in jsonChatters["chatters"]) {
    chattersArray.push({
      name: chatter,
      watchtime: +jsonChatters["chatters"][chatter]["watchtime"],
      ignore: jsonChatters["chatters"][chatter]["ignore"],
    });
  }

  const filteredChatters = chattersArray
    .filter((chatter) => chatter.watchtime >= minSeconds && !chatter.ignore)
    .sort((a, b) => -a.watchtime + b.watchtime);

  return filteredChatters;
};
