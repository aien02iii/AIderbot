// import module
var restify = require('restify');

var builder = require('botbuilder');

var request = require('request')

var menu = require('./menuConfig.json');
var mainMenu = menu.main ;
var painChart = menu.pain ;
var blisterpic = menu.blister;
var timeQuiz = menu.timequiz;

// Setup Web Server
var server = restify.createServer();
// 接微軟給的port 指定給 PORT
server.listen(process.env.port || process.env.PORT || "3978" , function(){
    console.log('%s listening to %s',server.name, server.url);
});

// Create chat connector for communication with the Bot Framework Server
// 雲端自動生成帳密存入變數
var connector = new builder.ChatConnector({
    appId : process.env.MicrosoftAppId,
    appPassword : process.env.MicrosoftAppPassword,
});

// Listen for messages from users
server.post('/api/messages', connector.listen());

// Default dialog
var bot = new builder.UniversalBot(connector, [
    function(session){
        session.send("您好，我是杯麵，您的個人保健小幫手。");
        session.replaceDialog('mainMenu');
    }
]);
// MainMenu 
bot.dialog('mainMenu',[
    function(session){
        builder.Prompts.choice(session,"請問你需要什麼服務?", mainMenu,{listStyle:builder.ListStyle.button});
    },
    function(session, results){
        session.beginDialog(mainMenu[results.response.entity]);    
    },
    function(session, results){
        output = results.response
        if (output.item == "inquiry"){
            var inquiry=output;
            session.send("===您的問診回答===<br/>疼痛指數"+inquiry.pain+"分<br/>發燒："+inquiry.fever+" "+inquiry.fevertime+"<br/>嘔吐："+inquiry.vomiting+" "+inquiry.vomitingtime+"<br/>呼吸急促或心跳加快："+inquiry.rapidHeartbeat+"<br/>咽喉腫痛、吞嚥困難："+inquiry.soreThroat+"<br/>紅疹、水泡："+inquiry.blister);
        }else if (output.item == "health"){
            var health=output;
            var healthdate = health.Date.slice(0,10);
            var height =health.height/100
            var BMI = health.weight/(height*height)
            session.send("===您輸入的生理量測值===<br/>量測日期:"+healthdate+"<br/>身份證字號："+health.ID+"<br/>收縮壓："+health.systolic+" mmHg<br/>舒張壓："+health.diastolic+" mmHg<br/>體重、身高："+health.weight+"公斤、"+health.height+"公分<br/>BMI："+BMI+" 公斤/平方公尺<br/>腰圍："+health.waist+"公分");

            summitToMySQL(health.ID, healthdate, health.systolic, health.systolic, health.diastolic, health.weight, health.height, BMI, health.waist, session);

        }        
        session.replaceDialog('mainMenu');
    }
]);
// summitToMySQL
// function summitToMySQL(userID, health_date, health_systolic, health_diastolic,health_weight, health_height, BMI, health_waist, session){
//     console.log(sID, sName, sUrl);
//     request({
//         uri: "",// INPUT YOUR API URL HERE
//         json:true,
//         method:"POST",
//         headers:{"Content-Type":"application/json"},
//         body:{"data":[{
//                  "userID":userID,
//                  "health_date":health_date,
//                  "health_systolic":health_systolic,
//                  "health_diastolic":health_diastolic,
//                  "health_weight":health_weight,
//                  "health_height":health_height,
//                  "health_BMI":BMI,
//                  "health_waist":health_waist
//         }]
//        }
//     },function(error, response, body){
//         if(!error && response.statusCode == 201){
//             session.send("你的生理量測已上傳完成!");
//         }else{
//             console.log(error);
//         }
//     });
// }

// inquiryMenu
bot.dialog('inquiryMenu',[
    function(session){
        session.dialogData.inquiry={item:"inquiry"};   //初始化

        builder.Prompts.number(session,"我聽到你不舒服（ ●—● ）。1～10分，請問你的疼痛指數是多少？");
        var msg = new builder.Message(session); //建立一個msg物件
        var heroCard = new builder.HeroCard(session)  //建立一個herocard
            .title(painChart.title)
            .subtitle(painChart.subtitle)
            .images([builder.CardImage.create(session,painChart.picture)])
            
        msg.addAttachment(heroCard);    //addAttachment只能放一個msg物件
        session.send(msg);
    },
    function(session, results){
        session.dialogData.inquiry.pain = results.response;
        builder.Prompts.choice(session,"請問你是否有『發燒』症狀?\n\n腋溫大於37℃、耳溫大於38℃、口溫大於37.5℃","是|否",{listStyle:builder.ListStyle.button});
    },
    function(session,results, next){
        session.dialogData.inquiry.fever = results.response.entity;
        if (session.dialogData.inquiry.fever == "是"){
            session.beginDialog('fevertime') 
        }else{
            next()
        }              
    },
    function(session,results){
        if (results.response){
            session.dialogData.inquiry.fevertime = results.response.entity;
        }else{
            session.dialogData.inquiry.fevertime = ""
        }
        
        builder.Prompts.choice(session,"請問你是否有『嘔吐』症狀?\n\n橫膈膜及腹肌等強烈共同收縮，使得胃內容物經由食道、口腔，反射性排出體外的現象。","是|否",{listStyle:builder.ListStyle.button});
    },
    function(session,results, next){
        session.dialogData.inquiry.vomiting = results.response.entity;
        if (session.dialogData.inquiry.vomiting == "是"){
            session.beginDialog('vomitingtime')
        }else{
            next()
        }       
    },
    function(session,results){
        if (results.response){
            session.dialogData.inquiry.vomitingtime = results.response.entity;
        }else{
            session.dialogData.inquiry.vomitingtime = ""
        }
        
        builder.Prompts.choice(session,"請問你是否有『呼吸急促或心跳加快』情況?\n\n心跳120次/分以上。呼吸速率30次/分以上","是|否",{listStyle:builder.ListStyle.button});
    },
    function(session,results){
        session.dialogData.inquiry.rapidHeartbeat = results.response.entity;
        builder.Prompts.choice(session,"請問你是否有『咽喉腫痛、吞嚥困難』情況?","是|否",{listStyle:builder.ListStyle.button});
    },
    function(session,results){
        session.dialogData.inquiry.soreThroat = results.response.entity;
        builder.Prompts.choice(session,"請問你是否有出現『紅疹、水泡』情況?\n\n類似下圖所示之情況","是|否",{listStyle:builder.ListStyle.button});
        var msg = new builder.Message(session); //建立一個msg物件
        var heroCard = new builder.HeroCard(session)  //建立一個herocard
            .title(blisterpic.title)
            .subtitle(blisterpic.subtitle)
            .text(blisterpic.text)
            .images([builder.CardImage.create(session,blisterpic.picture)])
            
        msg.addAttachment(heroCard);    //addAttachment只能放一個msg物件
        session.send(msg);
    },
    function(session,results){
        session.dialogData.inquiry.blister=results.response.entity;
        session.endDialogWithResult({
            response:session.dialogData.inquiry
        });
    }
]);
// fevertime
bot.dialog('fevertime',[
    function(session){
        session.dialogData.fevertime = {};
        builder.Prompts.choice(session,"請問『發燒』症狀困擾你多久了?",timeQuiz,{listStyle:builder.ListStyle.button});
    },
    function(session, results){
        session.dialogData.fevertime = results.response
        session.endDialogWithResult({
            response:session.dialogData.fevertime
        });
    }
]);
// vomitingtime
bot.dialog('vomitingtime',[    
    function(session){
        session.dialogData.vomitingtime = {};
        builder.Prompts.choice(session,"請問『嘔吐』症狀困擾你多久了?",timeQuiz,{listStyle:builder.ListStyle.button});
    },
    function(session, results){
        session.dialogData.vomitingtime = results.response
        session.endDialogWithResult({
            response:session.dialogData.vomitingtime
        });
    }
]);

// healthMenu
bot.dialog('healthMenu',[
    function(session){
        session.dialogData.health = {item:"health"} ;   //初始化，不然會 undefined
        builder.Prompts.time(session,"請問量測日期為?");
    },
    function(session,results){
        //利用chrono套件去解析日期/時間，chrono是一款自然語言datatime解析器，支援中文
        var MeasuringDate =results.response;
        session.dialogData.health.Date = builder.EntityRecognizer.resolveTime([MeasuringDate]) ; 
        builder.Prompts.text(session,`請問你的身分證字號為?`);
    },
    function(session,results){
        session.dialogData.health.ID=results.response;
        builder.Prompts.number(session,`請問你的『收縮壓』量測值?\n\n單位:mmHg、參考值: <120`);
    },
    function(session,results){
        session.dialogData.health.systolic=results.response;
        builder.Prompts.number(session,`請問你的『舒張壓』量測值?\n\n單位:mmHg、參考值: <80`);
    },
    function(session,results){
        session.dialogData.health.diastolic=results.response;
        builder.Prompts.number(session,`請問你的『心率(心跳數)』量測值?\n\n單位:次/分鐘、參考值: 60~100`);
    },
    function(session,results){
        session.dialogData.health.heartbeat=results.response;
        builder.Prompts.number(session,`請問你的『體重』量測值?\n\n單位:公斤、參考值: --`);
    },
    function(session,results){
        session.dialogData.health.weight=results.response;
        builder.Prompts.number(session,`請問你的『身高』量測值?\n\n單位:公分、參考值: --`);
    },
    function(session,results){
        session.dialogData.health.height=results.response;
        builder.Prompts.number(session,`請問你的『腰圍』量測值?\n\n單位:公分、參考值: --`);
    },
    function(session,results){
        session.dialogData.health.waist=results.response;
        session.endDialogWithResult({
            response:session.dialogData.health
        });
    }
]);