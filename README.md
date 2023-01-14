# Watchtime API

This is a simple API created to store watchtime values for a particular stream. It's meant to be used through a bot (like Nightbot) to perform automatic updates with the help of a timer (automated command).

It's currently not a robust API but it does its job for now.

## Features

- Customizable channel.
- Customizable list of users to be excluded (like bots).
- Fetch viewers with at least `x` watch time.
- Fetch the channel's top 5 viewers in descending order.
- Reset a channel's watch time records.
