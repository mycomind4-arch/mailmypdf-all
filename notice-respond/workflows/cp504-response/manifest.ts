import {
  createNoticeResponseManifest,
  cp504NoticeResponseProfile,
} from "@mailmypdf/workflows";

export const cp504Manifest = createNoticeResponseManifest({
  profile: cp504NoticeResponseProfile,
});

export default cp504Manifest;
