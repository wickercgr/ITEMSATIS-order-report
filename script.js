import fetch from 'node-fetch';
import cron from 'node-cron';

let token = "x"

let webhook = "x";

async function getDailyData() {
    const apiUrl = "https://www.itemsatis.com/api/merchant/v1/getMySoldOrders";

    const responses = await Promise.all([1, 2, 3, 4, 5].map(async (page) => {
        const requestBody = {
            Page: page,
            Limit: 500,
            token: token,
        };

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                accept: "application/json, text/plain, */*",
                "content-type": "application/json",
            },
            body: JSON.stringify(requestBody),
        });

        return response.json();
    }));
    const combinedData = responses.reduce((combined, response) => {
        if (response.Datas) {
            combined.push(...response.Datas);
        }
        return combined;
    }, []);
    const dailyData = combinedData.map((item) => {
        const netPrice = Number(item.Price) - Math.round(Number(item.Price) * 0.07, 2);
        return {
            State: Number(item.State),
            Price: Number(item.Price),
            Commission: Math.round(Number(item.Price) * 0.07, 2),
            NetPrice: netPrice,
            Datetime: item.Datetime,
            CategoryName: item.CategoryName,
            customerName: item.UserName,
        };
    });
    return dailyData;
}

async function Daily_Z_Report(dailyData) {
    let total_price = dailyData.reduce((a, b) => a + b.Price, 0);
    let total_net_price = dailyData.reduce((a, b) => a + b.NetPrice, 0);
    let approved = dailyData.filter((item) => item.State === 1);
    let unapproved = dailyData.filter((item) => item.State === 3);
    let canceled = dailyData.filter((item) => item.State === 6 || item.State === 7 || item.State === 8);
    let total_order = dailyData.length;
    let approved_order = approved.length;
    let unapproved_order = unapproved.length;
    let canceled_order = canceled.length;

    return {
        total_order: total_order,
        approved_order: approved_order,
        unapproved_order: unapproved_order,
        canceled_order: canceled_order,
        total_price: total_price,
        total_net_price: total_net_price
    }
}

async function Category_Earnings_Report(dailyData) {
    const categoryStats = {};
    dailyData.forEach(data => {
        const categoryName = data.CategoryName;
        if (categoryStats[categoryName]) {
            categoryStats[categoryName].salesCount += 1;
            categoryStats[categoryName].totalSales += data.Price;
            categoryStats[categoryName].totalEarnings += data.NetPrice;
        } else {
            categoryStats[categoryName] = {
                salesCount: 1,
                totalSales: data.Price,
                totalEarnings: data.NetPrice
            };
        }
    });
    const tableData = [["Kategori Adı", "Satış Adedi", "Satış Tutarı", "Net Kazanç"]];

    for (const [categoryName, stats] of Object.entries(categoryStats)) {
        tableData.push([
            categoryName,
            stats.salesCount,
            `${stats.totalSales.toFixed(2)} ₺`,
            `${stats.totalEarnings.toFixed(2)} ₺`
        ]);
    }

    const maxGenislikler = tableData[0].map((_, colIndex) =>
        Math.max(...tableData.map(row => String(row[colIndex]).length))
    );

    const generateTableRow = (rowData, maxColumnWidths) => {
        let rowContent = "";

        for (let j = 0; j < rowData.length; j++) {
            const cellValue = String(rowData[j]);
            const padding = maxColumnWidths[j] - cellValue.length;
            rowContent += ` ${cellValue}${' '.repeat(padding)} |`;
        }

        return rowContent;
    };

    const generateTable = (tableData, maxColumnWidths) => {
        let table = "|--------------|-------------|--------------|------------|\n";

        for (let i = 0; i < tableData.length; i++) {
            const rowContent = generateTableRow(tableData[i], maxColumnWidths);

            table += `|${rowContent}\n`;

            if (i === 0) {
                table += "|--------------|-------------|--------------|------------|\n";
            }
        }

        return table;
    };

    return embedDescription = generateTable(tableData, maxGenislikler)
}

async function Customer_Report(dailyData) {
    customerStats = {};
    dailyData.forEach(data => {
        const customerName = data.customerName;
        if (customerStats[customerName]) {
            customerStats[customerName].salesCount += 1;
            customerStats[customerName].totalSales += data.Price;
            customerStats[customerName].totalEarnings += data.NetPrice;
        } else {
            customerStats[customerName] = {
                salesCount: 1,
                totalSales: data.Price,
                totalEarnings: data.NetPrice
            };
        }
    });

    const tableData = [["Müşteri Adı", "Sipariş Adedi", "Satış Tutarı", "Net Kazanç"]];

    for (const [customerName, stats] of Object.entries(customerStats)) {
        tableData.push([
            customerName,
            stats.salesCount,
            `${stats.totalSales.toFixed(2)} ₺`,
            `${stats.totalEarnings.toFixed(2)} ₺`
        ]);
    }

    const maxGenislikler = tableData[0].map((_, colIndex) =>
        Math.max(...tableData.map(row => String(row[colIndex]).length))
    );

    const generateTableRow = (rowData, maxColumnWidths) => {
        let rowContent = "";

        for (let j = 0; j < rowData.length; j++) {
            const cellValue = String(rowData[j]);
            const padding = maxColumnWidths[j] - cellValue.length;
            rowContent += ` ${cellValue}${' '.repeat(padding)} |`;
        }

        return rowContent;
    };

    const generateTable = (tableData, maxColumnWidths) => {
        let table = `|${'─'.repeat(maxColumnWidths[0] + 2)}|${'─'.repeat(maxColumnWidths[1] + 2)}|${'─'.repeat(maxColumnWidths[2] + 2)}|${'─'.repeat(maxColumnWidths[3] + 2)}|\n`;

        for (let i = 0; i < tableData.length; i++) {
            const rowContent = generateTableRow(tableData[i], maxColumnWidths);

            table += `|${rowContent}\n`;

            if (i === 0) {
                table += `|${'─'.repeat(maxColumnWidths[0] + 2)}|${'─'.repeat(maxColumnWidths[1] + 2)}|${'─'.repeat(maxColumnWidths[2] + 2)}|${'─'.repeat(maxColumnWidths[3] + 2)}|\n`;
            }
        }

        return table;
    }

    return generateTable(tableData, maxGenislikler);
}

async function start() {
    let dailyData = await getDailyData();
    console.log(dailyData);
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Europe/Istanbul' };
    const [day, month, year] = new Date().toLocaleDateString('tr-TR', options).split('.');
    dailyData = dailyData.filter((item) => item.Datetime.includes(`${year}-${month}-${day}`));
    if (!dailyData) return console.log("Günlük veri bulunamadı.");
    let daily_z_report_Data = await Daily_Z_Report(dailyData);
    let category_earnings_report_Data = await Category_Earnings_Report(dailyData);
    let customer_report_Data = await Customer_Report(dailyData);
    let webhookData = await fetch(webhook, {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            embeds: [
                {
                    title: "Günlük Z Raporu",
                    fields: [
                        {
                            name: "Onaylanan Sipariş",
                            value: `\`\`\`${daily_z_report_Data.approved_order}\`\`\``,
                            inline: true
                        },
                        {
                            name: "Onaylanmayan Sipariş",
                            value: `\`\`\`${daily_z_report_Data.unapproved_order}\`\`\``,
                            inline: true
                        },
                        {
                            name: "İptal Olan Sipariş",
                            value: `\`\`\`${daily_z_report_Data.canceled_order}\`\`\``,
                            inline: true
                        },
                        {
                            name: "Toplam Sipariş",
                            value: `\`\`\`${daily_z_report_Data.total_order}\`\`\``,
                            inline: true
                        },
                        {
                            name: "Toplam Kazanç",
                            value: `\`\`\`${daily_z_report_Data.total_price} ₺\`\`\``,
                            inline: true
                        },
                        {
                            name: "Net Kazanç",
                            value: `\`\`\`${daily_z_report_Data.total_net_price} ₺\`\`\``,
                            inline: true
                        }
                    ]
                },
                {
                    title: "Kategori Kazanç Raporu",
                    description: `\`\`\`Markdown\n${category_earnings_report_Data}\`\`\``,
                },
                {
                    title: "Müşteri Raporu",
                    description: `\`\`\`Markdown\n${customer_report_Data}\`\`\``,
                    footer: {
                        text: `Tarih: ${year}-${month}-${day - 1}`
                    }
                }
            ],
        }),
        method: "POST",
    })
    if (webhookData.status !== 204) return console.log("Webhooka veri gönderilemedi.");
    console.log("Günlük rapor başarılı bir şekilde gönderildi. " + new Date().toLocaleString());
}

(async () => {
    console.log(`Sistem başarılı bir şekilde başlatıldı. ${new Date().toLocaleString()}`);
    console.log("Saat 01:00 olduğunda günlük rapor gönderilecektir.");
    cron.schedule('0 1 * * *', () => {
        start();
    });
})()