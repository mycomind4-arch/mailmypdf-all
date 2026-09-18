import {
  createNoticeResponseManifest,
  cp2000NoticeResponseProfile,
} from "@mailmypdf/workflows";

export const cp2000Manifest = createNoticeResponseManifest({
  profile: cp2000NoticeResponseProfile,
});

export default cp2000Manifest;
