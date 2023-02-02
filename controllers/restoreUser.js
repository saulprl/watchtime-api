import fetch from "node-fetch";
import * as dotenv from "dotenv";

dotenv.config();

const FIREBASE_API = process.env.FIREBASE;

const restoreUser = async (channel, user) => {
  const apiUrl = `${FIREBASE_API}/${channel}.json`;

  const firebaseChatters = await fetch(apiUrl);

  if (!firebaseChatters.ok) {
    throw new Error("There was an error while connecting to Firebase.");
  }

  const jsonChatters = await firebaseChatters.json();

  if (!jsonChatters) {
    throw new Error(
      `Unable to get watch time records for channel ${channel}. Start tracking first.`
    );
  }

  if (Object.keys(jsonChatters["chatters"]).includes(user)) {
    jsonChatters["chatters"][user]["ignore"] = false;
  } else {
    jsonChatters["chatters"][user] = { ignore: false, watchtime: 0 };
  }

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

export default restoreUser;
