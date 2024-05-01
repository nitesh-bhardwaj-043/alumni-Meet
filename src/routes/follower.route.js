import { Router } from "express";
import {
  toggleFollow,
  getFollowers,
  getFollowing,
} from "../controllers/follower.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/:userId").post(toggleFollow);
router.route("/get-followers").get(getFollowers);
router.route("/get-followings").get(getFollowing);

export default router;
