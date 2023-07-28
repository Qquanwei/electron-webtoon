/* eslint-disable */
import sortImgListByName from "../sortImgListByName";

describe("sort", () => {
  describe("imglist with name and list", () => {
    it("shoult be sort", () => {
      const imgList = [
        {
          name: "第一章",
          list: ["002.png", "001.png"],
        },
        {
          name: "第二章",
          list: ["002.png", "001.png"],
        },
      ];

      const newimgList = sortImgListByName(imgList);
      expect(newimgList).toHaveLength(2);
      expect(newimgList[0].name).toEqual("第一章");
      expect(newimgList[1].name).toEqual("第二章");
      expect(newimgList[0].list).toEqual(["001.png", "002.png"]);
      expect(newimgList[1].list).toEqual(["001.png", "002.png"]);
    });

    it("shoult be sort 0", () => {
      const imgList = [
        {
          name: "第一章",
          list: ["002.png", "001.png"],
        },
        {
          name: "最终章",
          list: ["002.png", "001.png"],
        },
        {
          name: "第二章",
          list: ["002.png", "001.png"],
        },
      ];

      const newimgList = sortImgListByName(imgList);
      expect(newimgList).toHaveLength(imgList.length);
      expect(newimgList[0].name).toEqual("第一章");
      expect(newimgList[1].name).toEqual("第二章");
      expect(newimgList[2].name).toEqual("最终章");
      expect(newimgList[0].list).toEqual(["001.png", "002.png"]);
      expect(newimgList[1].list).toEqual(["001.png", "002.png"]);
      expect(newimgList[2].list).toEqual(["001.png", "002.png"]);
    });
  });

  describe("url list", () => {
    it("should be sort", () => {
      const imgList = ["001.png", "002.png"];

      const newImgList = sortImgListByName([...imgList]);
      expect(newImgList).toEqual(imgList);
    });

    it("should be sort  1.5", () => {
      const imgList = ["000.png", "001.png", "002.png"];

      const newImgList = sortImgListByName([...imgList]);
      expect(newImgList).toEqual(imgList);
    });

    it("should be sort2", () => {
      const imgList = [
        "01/002第二章001.webp",
        "01/002第二章002.webp",
        "01/001第一章001.webp",
        "01/001第一章002.webp",
      ];

      const newImgList = sortImgListByName([...imgList]);
      expect(newImgList[0]).toEqual("01/001第一章001.webp");
      expect(newImgList[1]).toEqual("01/001第一章002.webp");
      expect(newImgList[2]).toEqual("01/002第二章001.webp");
      expect(newImgList[3]).toEqual("01/002第二章002.webp");
    });

    it("should be sort3", () => {
      const imgList = [
        "01/002第二章001.webp",
        "01/002第二章002.webp",
        "01/001第一章000.webp",
        "01/001第一章001.webp",
        "01/001第一章002.webp",
      ];

      const newImgList = sortImgListByName([...imgList]);
      expect(newImgList[0]).toEqual("01/001第一章000.webp");
      expect(newImgList[1]).toEqual("01/001第一章001.webp");
      expect(newImgList[2]).toEqual("01/001第一章002.webp");
      expect(newImgList[3]).toEqual("01/002第二章001.webp");
      expect(newImgList[4]).toEqual("01/002第二章002.webp");
    });

    it("处理章节数字有小数点的情况", () => {
      const imgList = [
        "01/002第二章001.webp",
        "01/002第二章002.webp",
        "01/002第二章002.5.webp",
        "01/002第二章003.webp",
        "01/001第一章000.webp",
        "01/001第一章001.webp",
        "01/001第一章002.webp",
      ];

      const newImgList = sortImgListByName([...imgList]);
      expect(newImgList[0]).toEqual("01/001第一章000.webp");
      expect(newImgList[1]).toEqual("01/001第一章001.webp");
      expect(newImgList[2]).toEqual("01/001第一章002.webp");
      expect(newImgList[3]).toEqual("01/002第二章001.webp");
      expect(newImgList[4]).toEqual("01/002第二章002.webp");
      expect(newImgList[5]).toEqual("01/002第二章002.5.webp");
      expect(newImgList[6]).toEqual("01/002第二章003.webp");
    });
  });

  // https://github.com/Qquanwei/electron-webtoon/issues/15
  describe('处理有无效数字干扰的情况', () => {
    const imgList = [{
      name: '001 开始',
      list: []
    }, {
      name: '010第4章',
      list: []
    }, {
      name: '101第2章',
      list: []
    }, {
      name: '000第3章',
      list: []
    }];

    const newImgList = sortImgListByName([...imgList]);

    expect(newImgList[0].name).toEqual('001 开始');
    expect(newImgList[1].name).toEqual('101第2章');
    expect(newImgList[2].name).toEqual('000第3章');
    expect(newImgList[3].name).toEqual('010第4章');
  });

  //https://github.com/Qquanwei/electron-webtoon/issues/17
  describe('处理番外，外传的特殊情况', () => {
    const imgList = [{
      name: '001 开始',
      list: []
    },  {
      name: '外传 01',
      list: []
    }, {
      name: '外传03',
      list: []
    }, {
      name: '番外 0004',
      list: []
    }, {
      name: '番外 000第3章',
      list: []
    }, {
      name: '010第4章',
      list: []
    }, {
      name: '101第2章',
      list: []
    }, {
      name: '000第3章',
      list: []
    }];

    const newImgList = sortImgListByName([...imgList]);

    const chapterList = newImgList.map(p => p.name);
    expect(chapterList).toEqual([
      '001 开始',
      '101第2章',
      '000第3章',
      '010第4章',
      '番外 000第3章',
      '番外 0004',
      '外传 01',
      '外传03'
    ]);
  });
});
