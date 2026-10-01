This project began from my growing interest in cloud engineering and cloud technologies. As more organizations continue to move their infrastructure and services to the cloud, I wanted to better understand the technologies driving this shift. Cloud platforms provide scalable and cost-effective solutions without requiring businesses to manage large amounts of physical hardware, making them a key part of modern computing.
To build my knowledge, I started learning cloud fundamentals, including Linux, networking, Python scripting, and cloud services. Throughout this process, I discovered that cloud engineering was a field I genuinely enjoyed and wanted to pursue further. Along the way, I also earned my Microsoft Azure Fundamentals (AZ-900) certification, which gave me a solid grasp of core cloud concepts. Actually applying that knowledge inside a real, working project turned out to be a different kind of learning experience, though. Translating textbook concepts into working code and real cloud configuration was something I was still figuring out as I went, and it became one of the most enjoyable parts of building this tool.
After gaining a solid foundation, I decided to create a real-world project that would demonstrate both my technical skills and my understanding of cloud concepts. I chose to develop a Cloud Cost Efficiency Tracker. Large organizations often use hundreds of cloud resources and services, making it difficult to monitor usage and control costs. This inspired me to build a tool that could help track cloud resources and identify potential cost-saving opportunities.
The remainder of this report documents my development journey, including the technologies I learned, the challenges I faced, and the solutions I implemented. Since I was still learning many of these technologies while building the project, this experience became both a technical project and a valuable learning opportunity.


Monday:
Today I wanted to keep it pretty simple by just creating the Azure environment. This meant adding a resource group, a storage account, and a VM, so that we could get real usage data to work with later. Instead of creating the services through the Azure Portal, I decided to use CLI commands. This was a bit of a learning experience since I'm used to regular CLI commands, but the Azure CLI worked a little differently.
First, I logged into the Azure environment.
Problem: Logging into my Microsoft account for Azure didn't work at first. It required MFA through my school's directory, since my subscription is a student-only account.

Solution: I fixed this by specifying the exact tenant to log into: az login --tenant "id#"
Second, I made the resource group, storage account and then the virtual machine. Generating the VM was hard because none of the cheap x64 VM sizes (B1s, B1ms, B2s) were available in my designated region since they didn't align with my Azure Student subscription's restrictions. So, I used the Azure CLI to filter for available cheap VMs specifically in West US 2, since that was one of the only regions my subscription allowed, which led me to an ARM-based B-series size instead, which is also somewhat cheap


Tuesday:
Today I focused on getting Python set up to actually talk to Azure and pull real cost data.
First, I created a service principal, which is basically a separate identity just for my script to use, instead of my own personal login. This keeps things secure since if the script's credentials ever got exposed, they'd only have limited, read-only access.
Second, I downloaded a few Python packages that contain pre-built code for talking to Azure's APIs, so I didn't have to build all the networking and authentication logic myself.
Writing the Python script was a bit tricky at first since I was still learning what needed to be typed and why. Rather than asking AI to just give me the answer, I used it to guide me toward figuring things out myself, prompting me with questions and concepts instead of full solutions. This pushed me to actually research things on my own, like how to know which libraries within the Azure environment to import for a given task. Concepts like creating objects, building dictionaries, and try and catch were things I already understood, so once I got past the initial learning curve, the process became pretty straightforward.
Step by Step Process:
Logs in using the service principal's credentials
Connects to Azure's Cost Management API to get the values needed for analyzation 
Asks for the actual cost data from my subscription, broken down by day

Problem: My code editor (VS Code) was running my script using a different version of Python than the one I originally installed my packages on, which caused a "module not found" error.
Solution: I reinstalled the packages directly using that specific Python version so they matched up.

Problem: I kept getting a "429 Too many requests" error when calling the Cost Management API, but the error message alone didn't explain why or how long I needed to wait.
Solution: I used a try/except block to catch the error and print out more details from Azure's response. This showed hidden information, like the exact wait time and usage limits, that helped me figure out what was actually going wrong and how to fix it.


Wednesday:
Today I pulled real CPU usage data from my VM using Azure Monitor, reusing the same credentials from Tuesday. I built a resource ID for my VM, queried its hourly CPU usage over the past five days, and worked through a deeply nested response to get the actual values. I calculated the average CPU usage and wrote a rule to flag the VM as wasteful if it's below 10%. My VM averaged 0.177% CPU usage, confirming it's been almost completely idle.

Problem: The average calculation crashed since some hourly readings came back as None.
Solution: Added a check to skip None values before calculating the average.


Thursday:
Today I turned my cost and usage findings into a real dollar savings estimate, and built a dashboard to show everything visually.
First, I made a small pricing reference for a few VM sizes, then calculated my VM's estimated monthly cost and compared it to a smaller size to see potential savings. My VM came out to about $5.40/month, with downsizing possibly saving around $1.66/month.
For the dashboard, I already have experience with HTML, CSS, and JavaScript, so I used AI to help build the initial structure, then made changes and adjustments myself to fit my project. My Python script exports all its results (cost, CPU usage, savings, daily costs) into a JSON file, and the dashboard reads that file to display everything: cost and savings numbers, a CPU usage chart, a recommendation message, and a table of daily costs.

Problem: Trying to install Streamlit (a different tool for building dashboards) kept failing due to conflicts with other packages already on my computer.
Solution: Since I already knew web development, I built my own dashboard with HTML/CSS/JS instead, and had Python just export the data for it to use.

Problem: My environment variables kept resetting every time I opened a new terminal, causing login errors.
Solution: Re-entered them each time before running the script.

Problem: My chart's date range was hardcoded, so it didn't update automatically.
Solution: Used Python to automatically grab today's date, so the data always stays current.


Friday:
Today I focused on wrapping everything into a complete, working system and publishing it. I pushed the full project to GitHub, setting up a .gitignore to keep auto-generated files out of the repository, and regenerated my service principal's credentials as a security precaution before making the code public.

Problem: My date range for the CPU usage data was still showing an old end date instead of the current day each time I ran the script.
Solution: Used Python's datetime module to automatically generate today's date each run, so the dashboard always reflects the most up-to-date range without manual changes.

Technologies Used

Python — scripting, Azure API integration, data processing
Azure CLI — resource provisioning (resource group, storage account, VM)
Azure SDKs — azure-identity, azure-mgmt-costmanagement, azure-mgmt-monitor
Azure Cost Management API — real billing/cost data
Azure Monitor API — real-time resource usage metrics (CPU)
HTML, CSS, JavaScript — custom-built dashboard frontend
Git & GitHub — version control and project hosting

Key Findings
Using the live data pulled from my own Azure environment, the tool identified that my test VM was running at an average of just 0.174% CPU usage while costing approximately $5.40/month. Based on this, it calculated that downsizing to a smaller VM size could save approximately $1.66/month, a small-scale example of the exact kind of waste real FinOps tools are built to catch at a much larger, enterprise level.

Future Improvements
Expand the single waste-detection rule into a full rule-based recommendation engine, checking resources against multiple criteria (e.g. missing tags, over-provisioned storage redundancy) rather than just CPU usage alone
Add scenario comparisons that calculate and rank multiple optimization options side by side (different VM sizes, regions, or pricing models) to justify each recommendation with real numbers
Extend monitoring beyond a single VM to a full resource group or multi-resource environment



