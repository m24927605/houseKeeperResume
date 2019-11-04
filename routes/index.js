const express = require('express');
const router = express.Router();
const uuidv1 = require('uuid/v1');
const path = require('path');
const fs = require('fs');
const pdf = require('html-pdf');
const nodemailer = require('nodemailer');

/* GET home page. */
router.get('/', (req, res, next) => {
  res.render('asking');
});

router.post('/upload', (req, res, next) => {
  try {
    if (!req.files) {
      return res.status(400).send('No files were uploaded.');
    }

    // The name of the input field (i.e. "imageFile") is used to retrieve the uploaded file
    let imageFile = req.files.imageFile;
    let newPhotoName = uuidv1(); // ⇨ '1c572360-faca-11e7-83ee-9d836d45ff41'

    // Use the mv() method to place the file somewhere on your server
    imageFile.mv(__dirname + `/../public/images/${newPhotoName}-${imageFile.name}`, function (err) {
      if (err) {
        console.log('upload image problem:', err);
        return res.status(500).send(err);
      }
      else {
        res.send({ 'imageSrc': `${newPhotoName}-${imageFile.name}` })
      }
    });
  } catch (e) {
    console.log(e);
  }
});

router.post('/confirm', (req, res, next) => {
  try {
    let data = {};
    data = req.body;
    req.session.data = data;
    res.send({ redirect: '/confirm' });

  } catch (e) {
    console.log(e)
  }
});

router.get('/confirm', (req, res, next) => {
  let data = req.session.data;
  //console.log('data', data);

  res.render('confirm', data);
});

router.post('/sendEmail', (req, res, next) => {
  try {
    let allHtml = req.body.allHtml;
    let imgSrc = req.body.imgSrc;
    let modifiedHtml = allHtml.replace(/src="images/g, 'src="public/images')
    let uuid = uuidv1();
    fs.writeFileSync(__dirname + `/../html/${uuid}.html`, modifiedHtml, 'utf8');
    let html = fs.readFileSync(__dirname + `/../html/${uuid}.html`, 'utf8');
    let options = {
      base: 'file://' + __dirname + '/../',
      "height": "1754px",        // allowed units: mm, cm, in, px
      "width": "1270px",
    };
    let deleteHtmlPath = __dirname + `/../html/${uuid}.html`;
    let deleteImgPath = __dirname + `/../public/${imgSrc}`;
    let deletePDFPath = __dirname + `/../pdf/${uuid}.pdf`;

    pdf.create(html, options).toFile(__dirname + `/../pdf/${uuid}.pdf`, function (err, filePath) {
      if (err) {
        console.log('pdf create problem:', err);
      }
      //console.log(filePath); // { filename: '/app/businesscard.pdf' }

      //宣告發信物件
      let transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        secureConnecton: true,
        port: 587,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRIDKEY
        }
      });

      let emailOptions = {
        //寄件者
        //from: [process.env.FROM],
        //收件者
        //to: [process.env.TO1, process.env.TO2],
        //to: ['arthurxu12@gmail.com','sigatour@163.com'],
        //副本
        from:['m24927605@gmail.com'],
        to:['s99214054@mail1.ncnu.edu.tw'],
        cc: '',
        //密件副本
        bcc: '',
        //主旨
        subject: `FDW resume`,
        attachments: [{
          filename: `${uuid}.pdf`,
          path: __dirname + `/../pdf/${uuid}.pdf`,
          contentType: 'application/pdf'
        }]
      };

      //發送信件方法
      transporter.sendMail(emailOptions, function (error, info) {
        if (error) {
          console.log('send email problem:', error);
        } else {
          console.log('訊息發送: ' + info.response);
          fs.unlinkSync(deleteHtmlPath);
          fs.unlinkSync(deleteImgPath);
          fs.unlinkSync(deletePDFPath);
          res.send({ status: true });
        }
      });
    });

  } catch (e) {
    console.log(e)
    res.send({ status: false });
  }
});

module.exports = router;
