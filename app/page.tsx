import React from "react";
import ConnectSocket from "@/components/ConnectSocket"; // Adjust the import path as necessary
import VapiUI from "@/components/VapiUI"; // Adjust the import path as necessary

const CombinedPage: React.FC = () => {
	return (
		<div className="py-4">
			<h1 className="text-6xl font-bold text-center">
				Text <span className="font-thin">To</span> Dot
			</h1>
			<main
				style={{ display: "flex", flexDirection: "row", height: "100vh" }}
				className="py-10 gap-y-6"
			>
				{/* h1 */}
				{/* ConnectSocket and VapiUI components */}
				<div style={{ flex: 1 }}>
					<ConnectSocket />
				</div>
				<div style={{ flex: 1 }}>
					<VapiUI />
				</div>
			</main>
		</div>
	);
};

export default CombinedPage;
