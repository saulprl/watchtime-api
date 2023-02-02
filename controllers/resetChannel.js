import fetch from "node-fetch";
import * as dotenv from "dotenv";

dotenv.config();

const FIREBASE_API = process.env.FIREBASE;

const resetChannel = async (channel) => {
  const apiUrl = `${FIREBASE_API}/${channel}.json`;

  const firebaseChatters = await fetch(apiUrl);

  if (!firebaseChatters.ok) {
    throw new Error("There was an error while retrieving data.");
  }

  const jsonChatters = await firebaseChatters.json();

  if (!jsonChatters) {
    throw new Error(
      `Unable to get watch time records for channel ${channel}. Start tracking first.`
    );
  }

  for (const chatter in jsonChatters["chatters"]) {
    jsonChatters["chatters"][chatter]["watchtime"] = 0;
  }

  jsonChatters.lastUpdate = new Date().getTime();

  const firebaseRes = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(jsonChatters),
  });

  if (!firebaseRes.ok) {
    throw new Error("There was an error while saving data to Firebase.");
  }
};

export default resetChannel;
