#DevTinder APIS


authRoutes
-POST /signup
-POST /login
-POST/logout

profileRouter
-GET/profile/view
-PATCH/profile/edit
-PATCH/profile/password


/ConnectionRequestRouter
-POST/request/send/:staus/:userId
-POST/request/review/:staus/:requestedId




-POST/request/review/interested/:requestedId
-POST/request/review/rejected/:requestedId

userRouter
-GET/user/connections
-GET/requests/recived
-GET/feed-Gets you the profiles of other users on plateform


status:ignore,interested,accepted,rejected