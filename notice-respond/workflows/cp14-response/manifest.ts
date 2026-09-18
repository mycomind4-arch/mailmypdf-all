import {
  createNoticeResponseManifest,
  cp14NoticeResponseProfile,
} from "@mailmypdf/workflows";

export const cp14Manifest = createNoticeResponseManifest({
  profile: cp14NoticeResponseProfile,
});

export default cp14Manifest;
