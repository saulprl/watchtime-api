import fetch from "node-fetch";
import * as dotenv from "dotenv";

dotenv.config();

const FIREBASE_API = process.env.FIREBASE;

const updateWatchTime = async (channel) => {
  // Make it so updates only happen when the broadcaster is in chat or live.
  const apiUrl = `${FIREBASE_API}/${channel}.json`;

  const firebaseChatters = await fetch(apiUrl);
  const jsonChatters = await firebaseChatters.json();

  const chatterData = jsonChatters ?? {
    lastUpdate: new Date().getTime(),
    chatters: {},
  };

  const tmiUrl = `http://tmi.twitch.tv/group/user/${channel}/chatters`;
  const tmiResponse = await fetch(tmiUrl);

  if (!tmiResponse.ok) {
    throw new Error("TMI returned an error.");
  }

  const tmiData = (await tmiResponse.json())["chatters"];
  console.log(tmiData);

  if (tmiData["broadcaster"].length < 1) {
    console.log("No broadcaster");
    return;
  }

  const activeViewers = [
    ...tmiData["broadcaster"],
    ...tmiData["vips"],
    ...tmiData["moderators"],
    ...tmiData["viewers"],
    ...tmiData["staff"],
    ...tmiData["admins"],
    ...tmiData["global_mods"],
  ];

  const timeDiff = Math.min(
    15,
    Math.floor((new Date().getTime() - chatterData.lastUpdate) / 1000)
  );

  for (const viewer of activeViewers) {
    if (!Object.keys(chatterData.chatters).includes(viewer)) {
      chatterData.chatters[viewer] = { watchtime: 0, ignore: false };
    } else if (!chatterData.chatters[viewer]["ignore"]) {
      chatterData.chatters[viewer]["watchtime"] += timeDiff;
    }
  }

  chatterData.lastUpdate += timeDiff * 1000;

  const firebaseRes = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(chatterData),
  });

  if (!firebaseRes.ok) {
    throw new Error("An error occurred when connecting to Firebase.");
  }
};

export default updateWatchTime;
