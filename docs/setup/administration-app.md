---
sidebar_position: 2
---

# Administration App

Can be used on Windows, macOs, Linux. We do not provide binary releases. You hav e to build the app by your own.
Before you build your admin app you can customize it by adding custom icon, title or colors.
We will create release tags, when new features or improvemnets are available. So you can automate your build by listening on them

### Build from source

Please refer to the official flutter homepage to leran on how to build the app for widnow, linux and macos.

### First start

#### Login

On First start you have to login. To login you need to pass several informations once. In all other logins only username and password need to be eneterd.
One client id and admin user should be cerated before the initila admin can login.

<image />

- **User**: Username of the admin
- **Password**: Password of the admin user

- **Url**: The adress and prot of your backend server is liten to e.g https://abc.de:555
- **ClientId**: Id the current admin app client authorized againsed the backend.
- **appkey**: Key for all user admin apps to authoorize against the backend.

#### Default group

Create one default group, so clients and records are streamed. If no group is available the clients will not see te records.