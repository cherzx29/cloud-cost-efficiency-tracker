import os
import json
#Import all azure libraries need to get cost data
from azure.identity import ClientSecretCredential
from azure.mgmt.costmanagement import CostManagementClient
from azure.core.exceptions import HttpResponseError
from azure.mgmt.monitor import MonitorManagementClient
from datetime import datetime, timezone

#Get azure credentials from environment variables
azureClientId = os.environ.get("AZURE_CLIENT_ID")
azureClientSecret = os.environ.get("AZURE_CLIENT_SECRET")
azureTenantId = os.environ.get("AZURE_TENANT_ID")
azureSubscriptionId = os.environ.get("AZURE_SUBSCRIPTION_ID")

#Create the objects needed to get cost data from azure by calling the classes to pass in the arguments
userIdentity = ClientSecretCredential(tenant_id = azureTenantId, client_id = azureClientId, client_secret = azureClientSecret)
costClient = CostManagementClient(credential = userIdentity)

#Create the dictionary to define the query we want to run to get cost data from azure
queryDefinition = {'type': "ActualCost", 'timeframe': "MonthToDate",'dataset': {
        'granularity': "Daily", 'aggregation': {'totalCost': {
                'name': "Cost", 'function': "Sum"
            }
        }
    }
}

#Tell azure which subscription we want cost data from, which is for our query defintion
try:
    costResult = costClient.query.usage(
    scope=f"/subscriptions/{azureSubscriptionId}",
    parameters=queryDefinition,
    headers={
        "x-ms-command-name": "CostAnalysis",
        "ClientType": "cloud-cost-tracker-jerry"
    }
)
   # print(costResult)
except HttpResponseError as e:
    #print("Error occurred:", e)
    #print("Response headers:", e.response.headers)
    pass


monitorClient = MonitorManagementClient(credential=userIdentity, subscription_id=azureSubscriptionId)

vmResourceId = f"/subscriptions/{azureSubscriptionId}/resourceGroups/cloud-cost-project-rg/providers/Microsoft.Compute/virtualMachines/cloud-cost-vm"

endDate = datetime.now(timezone.utc).strftime("%Y-%m-%dT23:59:59Z")

clientUsageData = monitorClient.metrics.list(
    vmResourceId,
    timespan="2026-09-08T00:00:00Z/" + endDate,
    interval="PT1H",
    metricnames="Percentage CPU",
    aggregation="Average"
)

cpuValues = []
cpuSeries = []

for item in clientUsageData.value[0].timeseries[0].data:
    if item.average is not None:
        cpuValues.append(item.average)
        cpuSeries.append({"time": item.time_stamp.isoformat(), "value": item.average})

average = sum(cpuValues) / len(cpuValues)

if average < 10:
    print(f"The VM looks underutilized. The CPU usage for the VM is: {average:.3f}% from Sept 8 to Sept 12, 2026")
else:
    print(f"The VM looks utilized. The CPU usage for the VM is: {average:.3f}% from Sept 8 to Sept 12, 2026")


vmPricing = {'Standard_B2pts_v2': 0.0075, 'Standard_B1ls': 0.0052, 'Standard_B1s': 0.0104}

monthlyCost = vmPricing['Standard_B2pts_v2'] * 24 * 30

smallerMonthlyCost = vmPricing['Standard_B1ls'] * 24 * 30 

savings = monthlyCost - smallerMonthlyCost

print(f"This VM is costing approximately ${monthlyCost:.2f}/month. Based on an average CPU usage of {average:.3f}%, this VM appears underutilized. Downsizing to a smaller size (Standard_B1ls) could save approximately ${savings:.2f}/month.")

todayStr = datetime.now(timezone.utc).strftime("%b %d, %Y")

dailyCost = []

for row in costResult.rows:
    date = row[1]
    cost = row[0]
    dailyCost.append({"date": date, "cost": cost})

dashboardData = {
    "reportRange": f"Sept 8 - {todayStr}",
    "monthlyCost": monthlyCost,
    "cpuAverage": average,
    "cpuSeries": cpuSeries,
    "savings": savings,
    "savingsSub": "Downsizing to Standard_B1ls",
    "isWasteful": average < 10,
    "dailyCost": dailyCost,
    "verdictTag": "Underutilized" if average < 10 else "Efficient",
    "verdictBody": f"This VM is costing approximately ${monthlyCost:.2f}/month. Based on an average CPU usage of {average:.3f}%, this VM appears underutilized. Downsizing to a smaller size (Standard_B1ls) could save approximately ${savings:.2f}/month."
}

with open('data.json', 'w') as json_file:
    json.dump(dashboardData, json_file, indent=4)