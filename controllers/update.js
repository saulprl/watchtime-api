const updateWatchTime = async (channel, chatters) => {
  // Make it so updates only happen when the broadcaster is in chat or live.
  const apiUrl = `${FIREBASE_API}/${channel}.json`;

  const firebaseChatters = await fetch(apiUrl);
  const jsonChatters = await firebaseChatters.json();

  const chatterData = jsonChatters ?? {
    lastUpdate: new Date().getTime(),
    chatters: {},
  };

  const tmiUrl = `http://tmi.twitch.tv/group/user/${channel}/chatters`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("TMI returned an error.");
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

  chatterData.lastUpdate = new Date().getTime();
};
